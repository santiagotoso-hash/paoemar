"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const categoriaSchema = z.object({
  nombre: z.string().min(1, "Requerido"),
  icono: z.string().optional(),
});

export async function crearCategoria(input: unknown) {
  await requireRole(["admin"]);
  const data = categoriaSchema.parse(input);
  await prisma.categoria.create({ data });
  revalidatePath("/admin/categorias");
}

export async function editarCategoria(id: string, input: unknown) {
  await requireRole(["admin"]);
  const data = categoriaSchema.parse(input);
  await prisma.categoria.update({ where: { id }, data });
  revalidatePath("/admin/categorias");
}
