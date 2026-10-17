import { prisma } from "@/lib/prisma";
import { TEXTO_UNIDADE } from "@/lib/estoque";
import { getRedisPublisher } from "@/lib/redis";

export const CHANNELS = {
  VENTAS: "ventas",
  STOCK_ALERTS: "stock-alerts",
} as const;

export type StockAlertProducto = {
  id: string;
  /** Código do produto; vazio nos insumos. */
  codigo: string;
  nombre: string;
  stockActual: string;
  stockMinimo: string;
  tipo: "producto" | "insumo";
  /** Só insumos: "kg", "un."… */
  unidad?: string;
};

/**
 * Produtos e insumos abaixo do mínimo. Produto com ficha técnica fica de fora:
 * quem baixa é o insumo. Compara em JS (não há como comparar duas colunas na query do Prisma).
 */
export async function getStockBajo(): Promise<StockAlertProducto[]> {
  const [productos, insumos] = await Promise.all([
    prisma.producto.findMany({
      where: { activo: true, receita: { none: {} } },
      select: { id: true, codigo: true, nombre: true, stockActual: true, stockMinimo: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.insumo.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, unidade: true, estoqueAtual: true, estoqueMinimo: true },
      orderBy: { nome: "asc" },
    }),
  ]);
  return [
    ...productos
      .filter((p) => Number(p.stockActual) <= Number(p.stockMinimo))
      .map((p) => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        stockActual: p.stockActual.toString(),
        stockMinimo: p.stockMinimo.toString(),
        tipo: "producto" as const,
      })),
    ...insumos
      .filter((i) => Number(i.estoqueAtual) <= Number(i.estoqueMinimo))
      .map((i) => ({
        id: i.id,
        codigo: "",
        nombre: i.nome,
        stockActual: i.estoqueAtual.toString(),
        stockMinimo: i.estoqueMinimo.toString(),
        tipo: "insumo" as const,
        unidad: TEXTO_UNIDADE[i.unidade],
      })),
  ];
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

/** Linha do tempo de um pedido na cozinha. */
export type TemposPedido = {
  lancado: string;
  emPreparo?: string | null;
  pronto?: string | null;
  entregue?: string | null;
};

export type VentaEvent = {
  id: string;
  codigo: string;
  nombreCliente: string;
  /** "MESA" = rodada lançada por um atendente (o id é o da Ronda, não de uma Venta). */
  origen: "MOSTRADOR" | "COMANDA" | "MESA";
  estado: "RECIBIDO" | "EN_PREPARACION" | "LISTO" | "ENTREGADO";
  createdAt: string;
  /** Só rodadas de mesa: quando o estado mudou (para o aviso de pedido parado). */
  estadoDesde?: string;
  /** Horários de cada etapa (ISO). Pedidos antigos/do balcão podem vir só com `lancado`. */
  tempos?: TemposPedido;
  items: VentaEventItem[];
};

export async function publishVentaEvent(venta: VentaEvent) {
  await getRedisPublisher().publish(CHANNELS.VENTAS, JSON.stringify(venta));
}
