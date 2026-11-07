"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, ROUTE_ROLES } from "@/lib/auth";
import { formatCnpj } from "@/lib/cliente";

const opcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null);

const clienteSchema = z.object({
  nombre: z.string().trim().min(1, "Informe o nome do cliente"),
  endereco: opcional,
  telefone: opcional,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || z.string().email().safeParse(v).success, "E-mail inválido"),
  cnpj: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.replace(/\D/g, "") : null))
    .refine((v) => v === null || v.length === 14, "O CNPJ precisa ter 14 dígitos")
    .transform((v) => (v ? formatCnpj(v) : null)),
  notas: opcional,
});

type Resultado = { ok: true } | { ok: false; error: string };

export async function crearCliente(input: unknown): Promise<Resultado> {
  await requireRole(ROUTE_ROLES["/encomendas"]);
  const parsed = clienteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  await prisma.cliente.create({ data: parsed.data });
  revalidatePath("/encomendas", "layout");
  return { ok: true };
}

export async function editarCliente(id: string, input: unknown): Promise<Resultado> {
  await requireRole(ROUTE_ROLES["/encomendas"]);
  const parsed = clienteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  await prisma.cliente.update({ where: { id }, data: parsed.data });
  revalidatePath("/encomendas", "layout");
  return { ok: true };
}

/** As encomendas do cliente ficam (só perdem o vínculo; o nome continua gravado nelas). */
export async function excluirCliente(id: string): Promise<Resultado> {
  await requireRole(ROUTE_ROLES["/encomendas"]);
  await prisma.cliente.deleteMany({ where: { id } });
  revalidatePath("/encomendas", "layout");
  return { ok: true };
}
