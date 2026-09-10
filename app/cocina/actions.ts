"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { publishVentaEvent } from "@/lib/realtime";

const ORDEN_ESTADOS = ["RECIBIDO", "EN_PREPARACION", "LISTO", "ENTREGADO"] as const;

export async function avanzarEstadoVenta(ventaId: string) {
  await requireRole(["admin", "cocina"]);

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
