import type { MetodoPago, OrigenVenta } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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
 * Crea una Venta + VentaItems y descuenta stock, todo en una transacción.
 * La usan tanto el mostrador (fase 5) como el cierre de comandas (fase 7).
 */
export async function crearVenta(params: CrearVentaParams) {
  const { items, origen, operadorId, metodoPago, nombreCliente, comandaId } = params;
  const servicio = params.servicio ?? 0;
  const enviarCocina = params.enviarCocina ?? true;
  const validarStock = params.validarStock ?? true;

  if (items.length === 0) {
    throw new Error("El carrito está vacío");
  }

  const venta = await prisma.$transaction(async (tx) => {
    const cajaSesion = await tx.cajaSesion.findFirst({
      where: params.cajaSesionId
        ? { id: params.cajaSesionId, abierta: true }
        : { operadorId, abierta: true },
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
      if (validarStock && Number(producto.stockActual) < item.cantidad) {
        throw new Error(`Stock insuficiente de "${producto.nombre}" (quedan ${producto.stockActual})`);
      }
      const precioUnit = item.precioUnit ?? Number(producto.precio);
      const adicionais = item.adicionais ?? [];
      const total = (precioUnit + adicionais.reduce((acc, a) => acc + a.precio, 0)) * item.cantidad;
      subtotal += total;
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
        nombreCliente: nombreCliente || "Mostrador",
        subtotal,
        descuento: 0,
        servicio,
        total: subtotal + servicio,
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
  });

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

  return venta;
}
