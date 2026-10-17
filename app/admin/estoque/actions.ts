"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, ROUTE_ROLES } from "@/lib/auth";
import { publishStockAlerts } from "@/lib/realtime";
import { redondear4, registrarMovimento } from "@/lib/estoque";

const insumoSchema = z.object({
  nome: z.string().trim().min(1, "Obrigatório"),
  unidade: z.enum(["UN", "KG", "G", "L", "ML"]),
  estoqueMinimo: z.coerce.number().min(0),
});

/** Nome repetido cai no índice único; troca o erro cru do Prisma por uma mensagem clara. */
function traduzirErro(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    throw new Error("Já existe um insumo com esse nome");
  }
  throw err;
}

function atualizar() {
  revalidatePath("/admin/estoque");
  return publishStockAlerts();
}

export async function criarInsumo(input: unknown) {
  await requireRole(ROUTE_ROLES["/admin"]);
  const data = insumoSchema.parse(input);
  await prisma.insumo.create({ data }).catch(traduzirErro);
  await atualizar();
}

export async function editarInsumo(id: string, input: unknown) {
  await requireRole(ROUTE_ROLES["/admin"]);
  const data = insumoSchema.parse(input);
  await prisma.insumo.update({ where: { id }, data }).catch(traduzirErro);
  await atualizar();
}

export async function toggleAtivoInsumo(id: string, ativo: boolean) {
  await requireRole(ROUTE_ROLES["/admin"]);
  await prisma.insumo.update({ where: { id }, data: { ativo } });
  await atualizar();
}

const movimentoSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("ENTRADA_MANUAL"),
    quantidade: z.coerce.number().positive("Tem que ser maior que 0"),
    /** Custo por unidade; vazio = entrada sem custo (não mexe no custo médio). */
    custoUnit: z.coerce.number().min(0).optional(),
    motivo: z.string().trim().optional(),
  }),
  z.object({
    tipo: z.literal("PERDA"),
    quantidade: z.coerce.number().positive("Tem que ser maior que 0"),
    motivo: z.string().trim().min(1, "Diga o motivo da perda"),
  }),
  z.object({
    tipo: z.literal("AJUSTE"),
    /** Saldo contado (inventário); o movimento grava a diferença. */
    saldoContado: z.coerce.number(),
    motivo: z.string().trim().min(1, "Diga o motivo do ajuste"),
  }),
]);

export async function movimentarInsumo(insumoId: string, input: unknown) {
  await requireRole(ROUTE_ROLES["/admin"]);
  const dados = movimentoSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    switch (dados.tipo) {
      case "ENTRADA_MANUAL":
        await registrarMovimento(tx, {
          insumoId,
          tipo: "ENTRADA_MANUAL",
          quantidade: dados.quantidade,
          custoUnit: dados.custoUnit,
          motivo: dados.motivo || undefined,
        });
        break;
      case "PERDA":
        await registrarMovimento(tx, {
          insumoId,
          tipo: "PERDA",
          quantidade: -dados.quantidade,
          motivo: dados.motivo,
        });
        break;
      case "AJUSTE": {
        const insumo = await tx.insumo.findUniqueOrThrow({ where: { id: insumoId } });
        const diferenca = redondear4(dados.saldoContado - Number(insumo.estoqueAtual));
        if (diferenca === 0) throw new Error("O saldo contado é igual ao saldo atual");
        await registrarMovimento(tx, { insumoId, tipo: "AJUSTE", quantidade: diferenca, motivo: dados.motivo });
        break;
      }
    }
  });

  await atualizar();
}
