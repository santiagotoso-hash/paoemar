"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { crearVenta } from "@/lib/ventas";

export async function crearComanda(input: unknown) {
  await requireRole(["admin", "mostrador"]);
  const data = z
    .object({
      codigo: z.string().min(1, "Requerido"),
      nombreCliente: z.string().optional(),
    })
    .parse(input);

  const comanda = await prisma.comanda.create({ data });
  revalidatePath("/comandas");
  return comanda.id;
}

export async function agregarItemComanda(comandaId: string, input: unknown) {
  await requireRole(["admin", "mostrador"]);
  const data = z
    .object({
      productoId: z.string().min(1),
      cantidad: z.coerce.number().positive("Tiene que ser mayor a 0"),
      notas: z.string().optional(),
    })
    .parse(input);

  const comanda = await prisma.comanda.findUnique({ where: { id: comandaId } });
  if (!comanda || comanda.estado === "CERRADA") throw new Error("La comanda no está abierta");

  const producto = await prisma.producto.findUnique({ where: { id: data.productoId } });
  if (!producto) throw new Error("Producto no encontrado");

  await prisma.comandaItem.create({
    data: {
      comandaId,
      productoId: producto.id,
      cantidad: data.cantidad,
      precioUnit: producto.precio,
      notas: data.notas,
    },
  });
  revalidatePath(`/comandas/${comandaId}`);
}

export async function eliminarItemComanda(comandaId: string, itemId: string) {
  await requireRole(["admin", "mostrador"]);
  await prisma.comandaItem.delete({ where: { id: itemId } });
  revalidatePath(`/comandas/${comandaId}`);
}

const cerrarComandaSchema = z.object({
  metodoPago: z.enum(["EFECTIVO", "TARJETA_CREDITO", "TARJETA_DEBITO", "TRANSFERENCIA"]),
});

export async function cerrarComanda(comandaId: string, input: unknown) {
  const { userId } = await requireRole(["admin", "mostrador"]);
  const data = cerrarComandaSchema.parse(input);

  const comanda = await prisma.comanda.findUnique({
    where: { id: comandaId },
    include: { items: true },
  });
  if (!comanda) throw new Error("Comanda no encontrada");
  if (comanda.estado === "CERRADA") throw new Error("La comanda ya está cerrada");
  if (comanda.items.length === 0) throw new Error("La comanda no tiene ítems");

  await crearVenta({
    items: comanda.items.map((i) => ({
      productoId: i.productoId,
      cantidad: Number(i.cantidad),
      notas: i.notas ?? undefined,
      precioUnit: Number(i.precioUnit),
    })),
    origen: "COMANDA",
    operadorId: userId,
    metodoPago: data.metodoPago,
    nombreCliente: comanda.nombreCliente ?? undefined,
    comandaId: comanda.id,
  });

  await prisma.comanda.update({
    where: { id: comanda.id },
    data: { estado: "CERRADA", cerradaEn: new Date() },
  });

  revalidatePath("/comandas");
  revalidatePath(`/comandas/${comandaId}`);
}
