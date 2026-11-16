"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, ROUTE_ROLES } from "@/lib/auth";
import { publishStockAlerts } from "@/lib/realtime";
import { camposFiscais } from "@/lib/fiscal-schema";

const productoSchema = z.object({
  codigo: z.string().min(1, "Obrigatório"),
  nombre: z.string().min(1, "Obrigatório"),
  categoriaId: z.string().min(1, "Escolha uma categoria"),
  precio: z.coerce.number().positive("Tem que ser maior que 0"),
  tipoUnidad: z.enum(["UNIDAD", "KG"]),
  descripcion: z.string().optional(),
  stockActual: z.coerce.number().min(0),
  stockMinimo: z.coerce.number().min(0),
  ...camposFiscais,
  encomendavel: z.boolean().default(false),
  imprimirCozinha: z.boolean().default(false),
  imprimirProducao: z.boolean().default(false),
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

const receitaSchema = z.array(
  z.object({
    insumoId: z.string().min(1),
    quantidade: z.coerce.number().positive("A quantidade tem que ser maior que 0"),
  }),
);

/**
 * Substitui a ficha técnica do produto. Lista vazia = volta a usar o estoque do próprio produto.
 * Com ficha, a venda baixa os insumos e o stockActual do produto deixa de ser usado.
 */
export async function salvarReceita(produtoId: string, input: unknown) {
  await requireRole(ROUTE_ROLES["/admin"]);
  const linhas = receitaSchema.parse(input);
  if (new Set(linhas.map((l) => l.insumoId)).size !== linhas.length) {
    throw new Error("Há um insumo repetido na ficha técnica");
  }
  await prisma.$transaction([
    prisma.receitaItem.deleteMany({ where: { produtoId } }),
    prisma.receitaItem.createMany({ data: linhas.map((l) => ({ produtoId, ...l })) }),
  ]);
  revalidatePath("/admin/productos");
  await publishStockAlerts();
}
