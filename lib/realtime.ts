import { prisma } from "@/lib/prisma";
import { getRedisPublisher } from "@/lib/redis";

export const CHANNELS = {
  VENTAS: "ventas",
  STOCK_ALERTS: "stock-alerts",
} as const;

export type StockAlertProducto = {
  id: string;
  codigo: string;
  nombre: string;
  stockActual: string;
  stockMinimo: string;
};

/** Compara en JS (no hay forma simple de comparar dos columnas en la query de Prisma). */
export async function getStockBajo(): Promise<StockAlertProducto[]> {
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    select: { id: true, codigo: true, nombre: true, stockActual: true, stockMinimo: true },
    orderBy: { nombre: "asc" },
  });
  return productos
    .filter((p) => Number(p.stockActual) <= Number(p.stockMinimo))
    .map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      stockActual: p.stockActual.toString(),
      stockMinimo: p.stockMinimo.toString(),
    }));
}

export async function publishStockAlerts() {
  const alertas = await getStockBajo();
  await getRedisPublisher().publish(CHANNELS.STOCK_ALERTS, JSON.stringify(alertas));
}

export type VentaEventItem = {
  productoNombre: string;
  cantidad: string;
  notas: string | null;
};

export type VentaEvent = {
  id: string;
  codigo: string;
  nombreCliente: string;
  /** "MESA" = rodada lançada por um atendente (o id é o da Ronda, não de uma Venta). */
  origen: "MOSTRADOR" | "COMANDA" | "MESA";
  estado: "RECIBIDO" | "EN_PREPARACION" | "LISTO" | "ENTREGADO";
  createdAt: string;
  items: VentaEventItem[];
};

export async function publishVentaEvent(venta: VentaEvent) {
  await getRedisPublisher().publish(CHANNELS.VENTAS, JSON.stringify(venta));
}
