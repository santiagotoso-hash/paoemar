"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole, ROUTE_ROLES } from "@/lib/auth";
import { crearVenta } from "@/lib/ventas";

const itemSchema = z.object({
  productoId: z.string().min(1),
  cantidad: z.coerce.number().positive(),
});

const ventaSchema = z.object({
  items: z.array(itemSchema).min(1, "O carrinho está vazio"),
  metodoPago: z.enum(["EFECTIVO", "TARJETA_CREDITO", "TARJETA_DEBITO", "TRANSFERENCIA"]),
  nombreCliente: z.string().optional(),
});

export async function confirmarVentaMostrador(input: unknown) {
  const { userId } = await requireRole(ROUTE_ROLES["/pos"]);
  const data = ventaSchema.parse(input);

  const venta = await crearVenta({
    items: data.items,
    origen: "MOSTRADOR",
    operadorId: userId,
    metodoPago: data.metodoPago,
    nombreCliente: data.nombreCliente,
  });

  revalidatePath("/pos");
  return { id: venta.id, codigo: venta.codigo, total: venta.total.toString() };
}
