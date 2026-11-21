"use server";

import { z } from "zod";
import { camposPagamento, validarPagamento } from "@/lib/metodos-pago";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, ROUTE_ROLES } from "@/lib/auth";
import { bloquearComandaAbierta, crearVentaTx, publicarVenta } from "@/lib/ventas";

/** Las comandas abiertas desde /mesas (tienen atendente) se atienden y cierran solo allá. */
const ES_DE_MESA = "Esta comanda é de uma mesa do salão: atenda pela tela de Mesas.";

export async function crearComanda(input: unknown) {
  await requireRole(ROUTE_ROLES["/comandas"]);
  const data = z
    .object({
      codigo: z.string().min(1, "Obrigatório"),
      nombreCliente: z.string().optional(),
    })
    .parse(input);

  const comanda = await prisma.comanda.create({ data });
  revalidatePath("/comandas");
  return comanda.id;
}

export async function agregarItemComanda(comandaId: string, input: unknown) {
  await requireRole(ROUTE_ROLES["/comandas"]);
  const data = z
    .object({
      productoId: z.string().min(1),
      cantidad: z.coerce.number().positive("Tem que ser maior que 0"),
      notas: z.string().optional(),
    })
    .parse(input);

  const comanda = await prisma.comanda.findUnique({ where: { id: comandaId } });
  if (!comanda || comanda.estado === "CERRADA") throw new Error("A comanda não está aberta");
  if (comanda.atendenteId) throw new Error(ES_DE_MESA);

  const producto = await prisma.producto.findUnique({ where: { id: data.productoId } });
  if (!producto) throw new Error("Produto não encontrado");

  await prisma.$transaction(async (tx) => {
    if (!(await bloquearComandaAbierta(tx, comandaId))) throw new Error("A comanda não está aberta");
    await tx.comandaItem.create({
      data: {
        comandaId,
        productoId: producto.id,
        cantidad: data.cantidad,
        precioUnit: producto.precio,
        notas: data.notas,
      },
    });
  });
  revalidatePath(`/comandas/${comandaId}`);
}

export async function eliminarItemComanda(comandaId: string, itemId: string) {
  await requireRole(ROUTE_ROLES["/comandas"]);
  // Solo ítems de esta comanda, abierta y de la pantalla vieja (no se toca lo ya cobrado).
  const { count } = await prisma.comandaItem.deleteMany({
    where: { id: itemId, comandaId, comanda: { estado: "ABIERTA", atendenteId: null } },
  });
  if (count === 0) throw new Error("Não foi possível remover o item desta comanda");
  revalidatePath(`/comandas/${comandaId}`);
}

const cerrarComandaSchema = z.object({ ...camposPagamento }).superRefine(validarPagamento);

export async function cerrarComanda(comandaId: string, input: unknown) {
  const { userId } = await requireRole(ROUTE_ROLES["/comandas"]);
  const data = cerrarComandaSchema.parse(input);

  const venta = await prisma.$transaction(
    async (tx) => {
      if (!(await bloquearComandaAbierta(tx, comandaId))) throw new Error("A comanda não está aberta");
      const comanda = await tx.comanda.findUniqueOrThrow({
        where: { id: comandaId },
        include: { items: { include: { adicionais: true } } },
      });
      if (comanda.atendenteId) throw new Error(ES_DE_MESA);
      if (comanda.items.length === 0) throw new Error("A comanda não tem itens");

      const venta = await crearVentaTx(tx, {
        items: comanda.items.map((i) => ({
          productoId: i.productoId,
          cantidad: Number(i.cantidad),
          notas: i.notas ?? undefined,
          precioUnit: Number(i.precioUnit),
          adicionais: i.adicionais.map((a) => ({ nombre: a.nombre, precio: Number(a.precio) })),
        })),
        origen: "COMANDA",
        operadorId: userId,
        metodoPago: data.metodoPago,
        bandeira: data.bandeira,
        nombreCliente: comanda.nombreCliente ?? undefined,
        comandaId: comanda.id,
      });

      await tx.comanda.update({
        where: { id: comanda.id },
        data: { estado: "CERRADA", cerradaEn: new Date() },
      });
      return venta;
    },
    { timeout: 15_000 }
  );

  await publicarVenta(venta);

  revalidatePath("/comandas");
  revalidatePath(`/comandas/${comandaId}`);
}
