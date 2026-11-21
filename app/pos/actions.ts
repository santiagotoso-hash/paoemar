"use server";

import { z } from "zod";
import { camposPagamento, validarPagamento } from "@/lib/metodos-pago";
import { revalidatePath } from "next/cache";
import { requireRole, ROUTE_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redondear2 } from "@/lib/format";
import { crearVenta, type VentaItemInput } from "@/lib/ventas";

const itemSchema = z.object({
  productoId: z.string().min(1),
  cantidad: z.coerce.number().positive(),
  opcionIds: z.array(z.string()).max(10).default([]),
  adicionalIds: z.array(z.string()).max(30).default([]),
  notas: z.string().max(140).optional(),
});

const ventaSchema = z
  .object({
    items: z.array(itemSchema).min(1, "O carrinho está vazio"),
    ...camposPagamento,
    nombreCliente: z.string().optional(),
    embalagem: z.boolean().optional(),
  })
  .superRefine(validarPagamento);

export async function confirmarVentaMostrador(input: unknown) {
  const { userId } = await requireRole(ROUTE_ROLES["/pos"]);
  const data = ventaSchema.parse(input);

  // Opções e adicionais são conferidos e precificados aqui (o preço vindo do cliente não é confiável).
  const productos = await prisma.producto.findMany({
    where: { id: { in: data.items.map((i) => i.productoId) } },
    include: { adicionais: true, gruposOpcion: { include: { opciones: true } } },
  });
  const items: VentaItemInput[] = [];
  for (const item of data.items) {
    const p = productos.find((x) => x.id === item.productoId);
    if (!p || !p.activo) throw new Error("Um dos produtos não está mais disponível");

    const escolhidas = [];
    for (const g of p.gruposOpcion) {
      const noGrupo = g.opciones.filter((o) => item.opcionIds.includes(o.id));
      if (noGrupo.length > 1 || (g.obligatorio && noGrupo.length === 0)) {
        throw new Error(`Escolha ${g.nombre.toLocaleLowerCase("pt-BR")} de ${p.nombre}`);
      }
      escolhidas.push(...noGrupo);
    }
    if (escolhidas.length !== item.opcionIds.length) throw new Error(`Opção inválida em ${p.nombre}`);

    const adicionais = p.adicionais.filter((a) => item.adicionalIds.includes(a.id));
    if (adicionais.length !== item.adicionalIds.length) throw new Error(`Adicional inválido em ${p.nombre}`);

    items.push({
      productoId: p.id,
      cantidad: item.cantidad,
      precioUnit: redondear2(Number(p.precio) + escolhidas.reduce((acc, o) => acc + Number(o.precio), 0)),
      notas: [escolhidas.map((o) => o.nombre).join(" · "), item.notas].filter(Boolean).join(" · ") || undefined,
      adicionais: adicionais.map((a) => ({ nombre: a.nombre, precio: Number(a.precio) })),
    });
  }

  const venta = await crearVenta({
    items,
    origen: "MOSTRADOR",
    operadorId: userId,
    metodoPago: data.metodoPago,
    bandeira: data.bandeira,
    nombreCliente: data.nombreCliente,
    embalagem: data.embalagem,
  });

  revalidatePath("/pos");
  return { id: venta.id, codigo: venta.codigo, total: venta.total.toString() };
}
