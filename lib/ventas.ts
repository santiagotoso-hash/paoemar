import type { MetodoPago, OrigenVenta, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { redondear2 } from "@/lib/format";
import { publishStockAlerts, publishVentaEvent } from "@/lib/realtime";

export type VentaItemInput = {
  productoId: string;
  cantidad: number;
  notas?: string;
  /** Si viene (ej. desde una comanda), se respeta ese precio congelado en vez del precio actual del producto. */
  precioUnit?: number;
  /** Adicionales con precio congelado (se suman al total del ítem). */
  adicionais?: { nombre: string; precio: number }[];
};

export type CrearVentaParams = {
  items: VentaItemInput[];
  origen: OrigenVenta;
  operadorId: string;
  metodoPago: MetodoPago;
  nombreCliente?: string;
  comandaId?: string;
  /** Taxa de serviço, separada del subtotal. */
  servicio?: number;
  /** Si viene, se usa esta caja en vez de la caja abierta del operador (mesas). */
  cajaSesionId?: string;
  /**
   * false = no va a cocina: la venta nace ENTREGADO y no se publica.
   * Lo usan las mesas, cuyos ítems ya fueron a cocina por rondas.
   */
  enviarCocina?: boolean;
  /** false = descuenta stock pero no bloquea si falta (mesas: el cliente ya consumió). */
  validarStock?: boolean;
};

/**
 * Traba la fila de la comanda hasta el fin de la transacción (SELECT … FOR UPDATE) y
 * devuelve si sigue ABIERTA. Serializa el cierre con el alta de rondas/ítems: lo que
 * entra después del cierre ya encuentra la comanda cerrada.
 */
export async function bloquearComandaAbierta(tx: Prisma.TransactionClient, comandaId: string) {
  const filas = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Comanda" WHERE id = ${comandaId} AND estado = 'ABIERTA' FOR UPDATE`;
  return filas.length > 0;
}

/**
 * Crea la Venta + VentaItems y descuenta stock dentro de una transacción ya abierta.
 * La usan los cierres de comanda/mesa, que cierran la comanda en la misma transacción.
 * No publica nada: después del commit hay que llamar a `publicarVenta`.
 */
export async function crearVentaTx(tx: Prisma.TransactionClient, params: CrearVentaParams) {
  const { items, origen, operadorId, metodoPago, nombreCliente, comandaId } = params;
  const servicio = redondear2(params.servicio ?? 0);
  const enviarCocina = params.enviarCocina ?? true;
  const validarStock = params.validarStock ?? true;

  if (items.length === 0) {
    throw new Error("O carrinho está vazio");
  }

  const cajaSesion = await tx.cajaSesion.findFirst({
    where: params.cajaSesionId
      ? { id: params.cajaSesionId, abierta: true }
      : { operadorId, abierta: true },
  });
  if (!cajaSesion) {
    throw new Error("Você não tem um caixa aberto. Abra um caixa antes de vender.");
  }

  const productos = await tx.producto.findMany({
    where: { id: { in: items.map((i) => i.productoId) } },
  });

  let subtotal = 0;
  const itemsData = items.map((item) => {
    const producto = productos.find((p) => p.id === item.productoId);
    if (!producto) throw new Error("Um dos produtos não existe mais");
    if (item.cantidad <= 0) throw new Error(`Quantidade inválida para ${producto.nombre}`);
    if (validarStock && Number(producto.stockActual) < item.cantidad) {
      throw new Error(`Estoque insuficiente de "${producto.nombre}" (restam ${producto.stockActual})`);
    }
    const precioUnit = redondear2(item.precioUnit ?? Number(producto.precio));
    const adicionais = item.adicionais ?? [];
    const total = redondear2((precioUnit + adicionais.reduce((acc, a) => acc + a.precio, 0)) * item.cantidad);
    subtotal = redondear2(subtotal + total);
    return {
      productoId: producto.id,
      cantidad: item.cantidad,
      precioUnit,
      total,
      notas: item.notas,
      ...(adicionais.length > 0 ? { adicionais: { create: adicionais } } : {}),
    };
  });

  const codigo = `V-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const nuevaVenta = await tx.venta.create({
    data: {
      codigo,
      origen,
      nombreCliente: nombreCliente || "Balcão",
      subtotal,
      descuento: 0,
      servicio,
      total: redondear2(subtotal + servicio),
      metodoPago,
      ...(enviarCocina ? {} : { estado: "ENTREGADO" as const }),
      cajaSesionId: cajaSesion.id,
      operadorId,
      comandaId,
      items: { create: itemsData },
    },
    include: { items: { include: { producto: true } } },
  });

  for (const item of itemsData) {
    await tx.producto.update({
      where: { id: item.productoId },
      data: { stockActual: { decrement: item.cantidad } },
    });
  }

  return nuevaVenta;
}

type VentaCreada = Awaited<ReturnType<typeof crearVentaTx>>;

/** Avisa a cocina (si corresponde) y recalcula alertas de stock. Llamar después del commit. */
export async function publicarVenta(venta: VentaCreada, enviarCocina = true) {
  if (enviarCocina) {
    await publishVentaEvent({
      id: venta.id,
      codigo: venta.codigo,
      nombreCliente: venta.nombreCliente,
      origen: venta.origen,
      estado: venta.estado,
      createdAt: venta.createdAt.toISOString(),
      items: venta.items.map((i) => ({
        productoNombre: i.producto.nombre,
        cantidad: i.cantidad.toString(),
        notas: i.notas,
      })),
    });
  }
  await publishStockAlerts();
}

/**
 * Crea una Venta + VentaItems y descuenta stock, todo en una transacción.
 * La usa el mostrador; los cierres de comanda/mesa usan `crearVentaTx`.
 */
export async function crearVenta(params: CrearVentaParams) {
  const venta = await prisma.$transaction((tx) => crearVentaTx(tx, params), { timeout: 15_000 });
  await publicarVenta(venta, params.enviarCocina ?? true);
  return venta;
}
