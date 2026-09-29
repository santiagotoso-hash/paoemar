"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, ROUTE_ROLES } from "@/lib/auth";
import { publishStockAlerts } from "@/lib/realtime";

const productoSchema = z.object({
  codigo: z.string().min(1, "Requerido"),
  nombre: z.string().min(1, "Requerido"),
  categoriaId: z.string().min(1, "Elegí una categoría"),
  precio: z.coerce.number().positive("Tiene que ser mayor a 0"),
  tipoUnidad: z.enum(["UNIDAD", "KG"]),
  descripcion: z.string().optional(),
  stockActual: z.coerce.number().min(0),
  stockMinimo: z.coerce.number().min(0),
});

export async function crearProducto(input: unknown) {
  await requireRole(ROUTE_ROLES["/admin"]);
  const data = productoSchema.parse(input);
  await prisma.producto.create({ data });
  revalidatePath("/admin/productos");
  await publishStockAlerts();
}

export async function editarProducto(id: string, input: unknown) {
  await requireRole(ROUTE_ROLES["/admin"]);
  const data = productoSchema.parse(input);
  await prisma.producto.update({ where: { id }, data });
  revalidatePath("/admin/productos");
  await publishStockAlerts();
}

export async function toggleActivoProducto(id: string, activo: boolean) {
  await requireRole(ROUTE_ROLES["/admin"]);
  await prisma.producto.update({ where: { id }, data: { activo } });
  revalidatePath("/admin/productos");
  await publishStockAlerts();
}
