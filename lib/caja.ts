import { prisma } from "@/lib/prisma";

export async function getResumenCaja(cajaSesionId: string, fondoInicial: number) {
  const [ventasPorMetodo, movimientos] = await Promise.all([
    prisma.venta.groupBy({
      by: ["metodoPago"],
      where: { cajaSesionId },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.cajaMovimiento.findMany({
      where: { cajaSesionId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const efectivoVentas = Number(
    ventasPorMetodo.find((v) => v.metodoPago === "EFECTIVO")?._sum.total ?? 0
  );
  const totalVentas = ventasPorMetodo.reduce((acc, v) => acc + Number(v._sum.total ?? 0), 0);
  const sangrias = movimientos
    .filter((m) => m.tipo === "SANGRIA")
    .reduce((acc, m) => acc + Number(m.monto), 0);
  const suministros = movimientos
    .filter((m) => m.tipo === "SUMINISTRO")
    .reduce((acc, m) => acc + Number(m.monto), 0);

  const efectivoEsperado = fondoInicial + efectivoVentas + suministros - sangrias;

  return {
    ventasPorMetodo: ventasPorMetodo.map((v) => ({
      metodoPago: v.metodoPago,
      total: Number(v._sum.total ?? 0),
      cantidad: v._count._all,
    })),
    totalVentas,
    sangrias,
    suministros,
    efectivoEsperado,
    movimientos: movimientos.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      monto: m.monto.toString(),
      descripcion: m.descripcion,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export type ResumenCaja = Awaited<ReturnType<typeof getResumenCaja>>;
