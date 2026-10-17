"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma, type UnidadeInsumo } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, ROUTE_ROLES } from "@/lib/auth";
import { publishStockAlerts } from "@/lib/realtime";
import { redondear4, registrarMovimento } from "@/lib/estoque";
import { redondear2 } from "@/lib/format";
import { lerNFe } from "@/lib/nfe-xml";

const SOMENTE_DIGITOS = (v: string) => v.replace(/\D/g, "");
const LIMITE_XML_BYTES = 1_000_000;

const UNIDADE_DA_NF: Record<string, UnidadeInsumo> = { KG: "KG", G: "G", L: "L", LT: "L", ML: "ML" };

export type RascunhoNFe = {
  chave: string;
  numero: string;
  serie: string;
  emitidaEm: string;
  total: number;
  fornecedor: { id: string | null; cnpj: string; nome: string };
  itens: {
    codigo: string;
    descricao: string;
    unidadeNF: string;
    quantidade: number;
    total: number;
    /** Insumo já reconhecido (pelo código do fornecedor ou pelo nome); null = escolher/criar. */
    insumoId: string | null;
    unidadeSugerida: UnidadeInsumo;
  }[];
};

/**
 * Lê o XML da NF-e e devolve um rascunho para o formulário conferir.
 * Não grava nada: quem lança a compra é `salvarCompra`.
 */
export async function lerXmlCompra(formData: FormData): Promise<RascunhoNFe> {
  await requireRole(ROUTE_ROLES["/admin"]);

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) throw new Error("Escolha o arquivo XML da NF");
  if (arquivo.size > LIMITE_XML_BYTES) throw new Error("Arquivo grande demais para ser uma NF-e");

  const nfe = lerNFe(await arquivo.text());

  if (nfe.chave) {
    const existente = await prisma.compra.findUnique({ where: { chaveAcesso: nfe.chave } });
    if (existente) throw new Error(`Esta NF já foi lançada (nº ${existente.numero})`);
  }

  const fornecedor = nfe.fornecedor.cnpj
    ? await prisma.fornecedor.findUnique({ where: { cnpj: nfe.fornecedor.cnpj } })
    : null;

  const mapeados = fornecedor
    ? await prisma.fornecedorInsumo.findMany({
        where: { fornecedorId: fornecedor.id, codigo: { in: nfe.itens.map((i) => i.codigo) } },
      })
    : [];
  const porNome = await prisma.insumo.findMany({
    where: { nome: { in: nfe.itens.map((i) => i.descricao), mode: "insensitive" } },
    select: { id: true, nome: true },
  });

  return {
    chave: nfe.chave,
    numero: nfe.numero,
    serie: nfe.serie,
    emitidaEm: nfe.emitidaEm,
    total: nfe.total,
    fornecedor: { id: fornecedor?.id ?? null, cnpj: nfe.fornecedor.cnpj, nome: fornecedor?.nome ?? nfe.fornecedor.nome },
    itens: nfe.itens.map((i) => ({
      codigo: i.codigo,
      descricao: i.descricao,
      unidadeNF: i.unidade,
      quantidade: i.quantidade,
      total: i.total,
      insumoId:
        mapeados.find((m) => m.codigo === i.codigo)?.insumoId ??
        porNome.find((n) => n.nome.toLowerCase() === i.descricao.toLowerCase())?.id ??
        null,
      unidadeSugerida: UNIDADE_DA_NF[i.unidade] ?? "UN",
    })),
  };
}

const itemSchema = z
  .object({
    insumoId: z.string().optional(),
    novoInsumo: z
      .object({ nome: z.string().trim().min(1, "Dê um nome ao insumo novo"), unidade: z.enum(["UN", "KG", "G", "L", "ML"]) })
      .optional(),
    codigoFornecedor: z.string().trim().optional(),
    descricao: z.string().trim().min(1),
    quantidade: z.coerce.number().positive("A quantidade tem que ser maior que 0"),
    total: z.coerce.number().min(0, "O valor não pode ser negativo"),
  })
  .refine((i) => i.insumoId || i.novoInsumo, { message: "Escolha o insumo de cada item" });

const compraSchema = z
  .object({
    fornecedorId: z.string().optional(),
    novoFornecedor: z.object({ nome: z.string().trim().min(1, "Informe o nome do fornecedor"), cnpj: z.string().optional() }).optional(),
    numero: z.string().trim().min(1, "Informe o número da NF"),
    serie: z.string().trim().default(""),
    chave: z
      .string()
      .transform(SOMENTE_DIGITOS)
      .refine((c) => c === "" || c.length === 44, "A chave de acesso tem 44 dígitos"),
    emitidaEm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de emissão"),
    observacao: z.string().trim().optional(),
    origem: z.enum(["MANUAL", "XML"]),
    itens: z.array(itemSchema).min(1, "Inclua ao menos um item"),
  })
  .refine((c) => c.fornecedorId || c.novoFornecedor, { message: "Escolha o fornecedor" });

/** Lança a NF de compra: grava a nota e dá entrada em cada insumo (com custo médio). */
export async function salvarCompra(input: unknown) {
  await requireRole(ROUTE_ROLES["/admin"]);
  const dados = compraSchema.parse(input);

  try {
    await prisma.$transaction(
      async (tx) => {
        let fornecedorId = dados.fornecedorId;
        if (!fornecedorId) {
          const cnpj = SOMENTE_DIGITOS(dados.novoFornecedor!.cnpj ?? "") || null;
          const existente = cnpj ? await tx.fornecedor.findUnique({ where: { cnpj } }) : null;
          fornecedorId =
            existente?.id ?? (await tx.fornecedor.create({ data: { nome: dados.novoFornecedor!.nome, cnpj } })).id;
        }

        // Resolve (ou cria) o insumo de cada linha.
        const insumoIds: string[] = [];
        const criadosNestaNota = new Map<string, string>();
        for (const item of dados.itens) {
          if (item.insumoId) {
            insumoIds.push(item.insumoId);
            continue;
          }
          const nome = item.novoInsumo!.nome;
          let id = criadosNestaNota.get(nome.toLowerCase());
          if (!id) {
            id = (await tx.insumo.create({ data: { nome, unidade: item.novoInsumo!.unidade } })).id;
            criadosNestaNota.set(nome.toLowerCase(), id);
          }
          insumoIds.push(id);
        }

        const total = redondear2(dados.itens.reduce((acc, i) => acc + i.total, 0));
        const compra = await tx.compra.create({
          data: {
            fornecedorId,
            numero: dados.numero,
            serie: dados.serie,
            chaveAcesso: dados.chave || null,
            emitidaEm: new Date(`${dados.emitidaEm}T12:00:00-03:00`),
            total,
            observacao: dados.observacao || null,
            origem: dados.origem,
          },
        });

        for (let idx = 0; idx < dados.itens.length; idx++) {
          const item = dados.itens[idx];
          const insumoId = insumoIds[idx];
          const custoUnit = redondear4(item.total / item.quantidade);
          await tx.compraItem.create({
            data: {
              compraId: compra.id,
              insumoId,
              descricao: item.descricao,
              quantidade: item.quantidade,
              custoUnit,
              total: redondear2(item.total),
            },
          });
          await registrarMovimento(tx, {
            insumoId,
            tipo: "ENTRADA_COMPRA",
            quantidade: item.quantidade,
            custoUnit,
            compraId: compra.id,
            motivo: `NF ${dados.numero}`,
          });
          if (item.codigoFornecedor) {
            await tx.fornecedorInsumo.upsert({
              where: { fornecedorId_codigo: { fornecedorId, codigo: item.codigoFornecedor } },
              create: { fornecedorId, codigo: item.codigoFornecedor, insumoId },
              update: { insumoId },
            });
          }
        }
      },
      { timeout: 30_000 },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const alvo = String(err.meta?.target ?? "");
      if (alvo.includes("nome")) throw new Error("Já existe um insumo com o nome de um dos itens novos; escolha-o na lista");
      throw new Error("Esta NF já foi lançada para esse fornecedor");
    }
    throw err;
  }

  revalidatePath("/admin/compras");
  revalidatePath("/admin/estoque");
  await publishStockAlerts();
}
