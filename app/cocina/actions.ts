"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, ROUTE_ROLES } from "@/lib/auth";
import { publishVentaEvent } from "@/lib/realtime";
import { numeroRonda, rondaCocinaInclude, rondaParaEvento } from "@/lib/rondas";

const ORDEN_ESTADOS = ["RECIBIDO", "EN_PREPARACION", "LISTO", "ENTREGADO"] as const;

export async function avanzarEstadoVenta(ventaId: string) {
  await requireRole(ROUTE_ROLES["/cocina"]);

  const venta = await prisma.venta.findUnique({ where: { id: ventaId } });
  if (!venta) throw new Error("Venta no encontrada");

  const idx = ORDEN_ESTADOS.indexOf(venta.estado);
  if (idx === -1 || idx === ORDEN_ESTADOS.length - 1) {
    throw new Error("La venta ya está en el último estado");
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
  if (!ronda) throw new Error("Rodada no encontrada");

  const idx = ORDEN_ESTADOS.indexOf(ronda.estado);
  if (idx === -1 || idx === ORDEN_ESTADOS.length - 1) {
    throw new Error("La rodada ya está en el último estado");
  }

  const actualizada = await prisma.ronda.update({
    where: { id: rondaId },
    data: { estado: ORDEN_ESTADOS[idx + 1] },
    include: rondaCocinaInclude,
  });

  await publishVentaEvent(rondaParaEvento(actualizada, await numeroRonda(actualizada)));

  revalidatePath("/cocina");
  revalidatePath(`/mesas/${ronda.comandaId}`);
}
