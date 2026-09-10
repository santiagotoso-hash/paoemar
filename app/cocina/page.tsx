import { prisma } from "@/lib/prisma";
import { CocinaBoard } from "./cocina-board";

export default async function CocinaPage() {
  const ventas = await prisma.venta.findMany({
    where: { estado: { in: ["RECIBIDO", "EN_PREPARACION", "LISTO"] } },
    include: { items: { include: { producto: true } } },
    orderBy: { createdAt: "asc" },
  });

  const ventasIniciales = ventas.map((v) => ({
    id: v.id,
    codigo: v.codigo,
    nombreCliente: v.nombreCliente,
    origen: v.origen,
    estado: v.estado,
    createdAt: v.createdAt.toISOString(),
    items: v.items.map((i) => ({
      productoNombre: i.producto.nombre,
      cantidad: i.cantidad.toString(),
      notas: i.notas,
    })),
  }));

  return <CocinaBoard ventasIniciales={ventasIniciales} />;
}
