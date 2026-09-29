import type { EstadoVenta } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { numeroRonda, rondaCocinaInclude, rondaParaEvento } from "@/lib/rondas";
import { CocinaBoard } from "./cocina-board";

export default async function CocinaPage() {
  const pendientes = { estado: { in: ["RECIBIDO", "EN_PREPARACION", "LISTO"] as EstadoVenta[] } };

  const [ventas, rondas] = await Promise.all([
    prisma.venta.findMany({
      where: pendientes,
      include: { items: { include: { producto: true } } },
      orderBy: { createdAt: "asc" },
    }),
    // Rodadas lanzadas desde las mesas
    prisma.ronda.findMany({
      where: pendientes,
      include: rondaCocinaInclude,
      orderBy: { creadaEn: "asc" },
    }),
  ]);

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

  const rondasIniciales = await Promise.all(
    rondas.map(async (r) => rondaParaEvento(r, await numeroRonda(r)))
  );

  const todos = [...ventasIniciales, ...rondasIniciales].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );

  return <CocinaBoard ventasIniciales={todos} />;
}
