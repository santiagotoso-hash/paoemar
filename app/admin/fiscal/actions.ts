"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, ROUTE_ROLES } from "@/lib/auth";
import { cnpjValido, soDigitos } from "@/lib/fiscal";
import { camposFiscais } from "@/lib/fiscal-schema";

type Resultado = { ok: true } | { ok: false; error: string };

const configSchema = z.object({
  ativa: z.boolean(),
  ambiente: z.enum(["HOMOLOGACAO", "PRODUCAO"]),
  cnpj: z.string().trim().optional(),
});

export async function salvarConfiguracaoFiscal(input: unknown): Promise<Resultado> {
  await requireRole(ROUTE_ROLES["/admin"]);

  const parsed = configSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const { ativa, ambiente, cnpj } = parsed.data;

  const cnpjLimpo = cnpj ? soDigitos(cnpj) : null;
  if (cnpjLimpo && !cnpjValido(cnpjLimpo)) return { ok: false, error: "CNPJ inválido" };
  if (ativa && !cnpjLimpo) return { ok: false, error: "Informe o CNPJ para ativar a emissão" };

  await prisma.configuracaoFiscal.upsert({
    where: { id: "unica" },
    create: { id: "unica", ativa, ambiente, cnpj: cnpjLimpo },
    update: { ativa, ambiente, cnpj: cnpjLimpo },
  });
  revalidatePath("/admin/fiscal");
  return { ok: true };
}

const dadosSchema = z.object(camposFiscais);

/** Dados fiscais padrão de uma categoria (valem para os produtos dela que não tiverem dados próprios). */
export async function salvarFiscalCategoria(id: string, input: unknown): Promise<Resultado> {
  await requireRole(ROUTE_ROLES["/admin"]);

  const parsed = dadosSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { ncm, cfop, csosn, origem } = parsed.data;

  await prisma.categoria.update({
    where: { id },
    data: { ncmPadrao: ncm, cfopPadrao: cfop, csosnPadrao: csosn, origemPadrao: origem },
  });
  revalidatePath("/admin/fiscal");
  return { ok: true };
}
