"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, ROUTE_ROLES } from "@/lib/auth";
import { CONEXOES, DESTINOS } from "@/lib/impressoras";

const impressoraSchema = z.object({
  destino: z.enum(DESTINOS),
  nome: z.string().trim().min(1, "Informe o nome da impressora"),
  ativa: z.boolean(),
  conexao: z.enum(CONEXOES),
  endereco: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
  porta: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v > 0 && v <= 65535), "Porta inválida"),
  larguraMm: z.union([z.literal(58), z.literal(80)]),
  copias: z.number().int().min(1, "Mínimo 1 via").max(5, "Máximo 5 vias"),
});

type Resultado = { ok: true } | { ok: false; error: string };

/** Cria ou atualiza a impressora do destino (há uma por destino). */
export async function salvarImpressora(input: unknown): Promise<Resultado> {
  await requireRole(ROUTE_ROLES["/admin"]);

  const parsed = impressoraSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const data = parsed.data;

  await prisma.impressora.upsert({
    where: { destino: data.destino },
    create: data,
    update: data,
  });
  revalidatePath("/admin/impressoras");
  return { ok: true };
}
