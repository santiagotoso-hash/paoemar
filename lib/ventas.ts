import type { MetodoPago, OrigenVenta } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishStockAlerts, publishVentaEvent } from "@/lib/realtime";

export type VentaItemInput = {
  productoId: string;
  cantidad: number;
  notas?: string;
  /** Si viene (ej. desde una comanda), se respeta ese precio congelado en vez del precio actual del producto. */
  precioUnit?: number;
};

export type CrearVentaParams = {
  items: VentaItemInput[];
  origen: OrigenVenta;
  operadorId: string;
  metodoPago: MetodoPago;
  nombreCliente?: string;
  comandaId?: string;
};

/**
 * Crea una Venta + VentaItems y descuenta stock, todo en una transacción.
 * La usan tanto el mostrador (fase 5) como el cierre de comandas (fase 7).
 */
export async function crearVenta(params: CrearVentaParams) {
  const { items, origen, operadorId, metodoPago, nombreCliente, comandaId } = params;

  if (items.length === 0) {
    throw new Error("El carrito está vacío");
  }

  const venta = await prisma.$transaction(async (tx) => {
    const cajaSesion = await tx.cajaSesion.findFirst({
      where: { operadorId, abierta: true },
    });
    if (!cajaSesion) {
      throw new Error("No tenés una caja abierta. Abrí una caja antes de vender.");
    }

    const productos = await tx.producto.findMany({
      where: { id: { in: items.map((i) => i.productoId) } },
    });

    let subtotal = 0;
    const itemsData = items.map((item) => {
      const producto = productos.find((p) => p.id === item.productoId);
      if (!producto) throw new Error("Uno de los productos ya no existe");
      if (item.cantidad <= 0) throw new Error(`Cantidad inválida para ${producto.nombre}`);
      if (Number(producto.stockActual) < item.cantidad) {
        throw new Error(`Stock insuficiente de "${producto.nombre}" (quedan ${producto.stockActual})`);
      }
      const precioUnit = item.precioUnit ?? Number(producto.precio);
      const total = precioUnit * item.cantidad;
      subtotal += total;
      return {
        productoId: producto.id,
        cantidad: item.cantidad,
        precioUnit,
        total,
        notas: item.notas,
      };
    });

    const codigo = `V-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const nuevaVenta = await tx.venta.create({
      data: {
        codigo,
        origen,
        nombreCliente: nombreCliente || "Mostrador",
        subtotal,
        descuento: 0,
        total: subtotal,
        metodoPago,
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
  });

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
  await publishStockAlerts();

  return venta;
}
