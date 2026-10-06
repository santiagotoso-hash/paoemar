"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, ROUTE_ROLES } from "@/lib/auth";
import { publishVentaEvent } from "@/lib/realtime";
import { numeroRonda, rondaCocinaInclude, rondaParaEvento } from "@/lib/rondas";

const ORDEN_ESTADOS = ["RECIBIDO", "EN_PREPARACION", "LISTO", "ENTREGADO"] as const;

/** Campo da linha do tempo da rodada gravado ao entrar em cada estado. */
const CAMPO_TEMPO = {
  EN_PREPARACION: "emPreparoEm",
  LISTO: "prontoEm",
  ENTREGADO: "entregueEm",
} as const;

export async function avanzarEstadoVenta(ventaId: string) {
  await requireRole(ROUTE_ROLES["/cocina"]);

  const venta = await prisma.venta.findUnique({ where: { id: ventaId } });
  if (!venta) throw new Error("Venda não encontrada");

  const idx = ORDEN_ESTADOS.indexOf(venta.estado);
  if (idx === -1 || idx === ORDEN_ESTADOS.length - 1) {
    throw new Error("A venda já está no último status");
  }

  const actualizada = await prisma.venta.update({
    where: { id: ventaId },
    data: { estado: ORDEN_ESTADOS[idx + 1] },
    include: { items: { include: { producto: true } } },
  });

  await publishVentaEvent({
    id: actualizada.id,
    codigo: actualizada.codigo,
    nombreCliente: actualizada.nombreCliente,
    origen: actualizada.origen,
    estado: actualizada.estado,
    createdAt: actualizada.createdAt.toISOString(),
    tempos: {
      lancado: actualizada.createdAt.toISOString(),
      entregue: actualizada.estado === "ENTREGADO" ? actualizada.updatedAt.toISOString() : null,
    },
    items: actualizada.items.map((i) => ({
      productoNombre: i.producto.nombre,
      cantidad: i.cantidad.toString(),
      notas: i.notas,
    })),
  });

  revalidatePath("/cocina");
}

/** Igual a avanzarEstadoVenta, pero para una rodada lanzada desde las mesas. */
export async function avanzarEstadoRonda(rondaId: string) {
  await requireRole(ROUTE_ROLES["/cocina"]);

  const ronda = await prisma.ronda.findUnique({ where: { id: rondaId } });
  if (!ronda) throw new Error("Rodada não encontrada");

  const idx = ORDEN_ESTADOS.indexOf(ronda.estado);
  if (idx === -1 || idx === ORDEN_ESTADOS.length - 1) {
    throw new Error("A rodada já está no último status");
  }

  const actualizada = await prisma.ronda.update({
    where: { id: rondaId },
    data: (() => {
      const novo = ORDEN_ESTADOS[idx + 1] as keyof typeof CAMPO_TEMPO;
      const agora = new Date();
      return { estado: novo, estadoDesde: agora, [CAMPO_TEMPO[novo]]: agora };
    })(),
    include: rondaCocinaInclude,
  });

  await publishVentaEvent(rondaParaEvento(actualizada, await numeroRonda(actualizada)));

  revalidatePath("/cocina");
  revalidatePath(`/mesas/${ronda.comandaId}`);
}
