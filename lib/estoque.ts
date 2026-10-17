import type { Prisma, TipoMovimentoEstoque, UnidadeInsumo } from "@prisma/client";

export const UNIDADES_INSUMO: UnidadeInsumo[] = ["UN", "KG", "G", "L", "ML"];

/** Texto curto da unidade para telas e alertas. */
export const TEXTO_UNIDADE: Record<UnidadeInsumo, string> = { UN: "un.", KG: "kg", G: "g", L: "L", ML: "mL" };

export const ROTULO_MOVIMENTO: Record<TipoMovimentoEstoque, string> = {
  ENTRADA_COMPRA: "Compra (NF)",
  ENTRADA_MANUAL: "Entrada manual",
  AJUSTE: "Ajuste",
  PERDA: "Perda",
  SAIDA_VENDA: "Venda",
};

/** Quantidades e custos unitários com até 4 casas (evita 0.30000000000000004 e dízimas). */
export function redondear4(valor: number) {
  return Math.round((valor + Number.EPSILON) * 10000) / 10000;
}

type MovimentoParams = {
  insumoId: string;
  tipo: TipoMovimentoEstoque;
  /** Com sinal: positivo entra, negativo sai. */
  quantidade: number;
  /** Só nas entradas: atualiza o custo médio ponderado. */
  custoUnit?: number;
  motivo?: string;
  compraId?: string;
  vendaId?: string;
};

/**
 * Muda o saldo do insumo e grava o movimento, dentro de uma transação já aberta.
 * O saldo é alterado com increment (atômico); o custo médio usa o saldo anterior
 * deduzido do resultado, então duas entradas simultâneas não se atropelam no saldo.
 */
export async function registrarMovimento(tx: Prisma.TransactionClient, p: MovimentoParams) {
  const atualizado = await tx.insumo.update({
    where: { id: p.insumoId },
    data: { estoqueAtual: { increment: p.quantidade } },
  });
  const saldoApos = Number(atualizado.estoqueAtual);

  if (p.custoUnit !== undefined && p.quantidade > 0) {
    const saldoAntes = saldoApos - p.quantidade;
    const custoMedio =
      saldoAntes > 0
        ? (saldoAntes * Number(atualizado.custoMedio) + p.quantidade * p.custoUnit) / saldoApos
        : p.custoUnit;
    await tx.insumo.update({
      where: { id: p.insumoId },
      data: { custoMedio: redondear4(custoMedio) },
    });
  }

  await tx.movimentoEstoque.create({
    data: {
      insumoId: p.insumoId,
      tipo: p.tipo,
      quantidade: p.quantidade,
      custoUnit: p.custoUnit,
      saldoApos,
      motivo: p.motivo,
      compraId: p.compraId,
      vendaId: p.vendaId,
    },
  });
}

/** Fichas técnicas dos produtos informados, agrupadas por produto. */
export async function buscarReceitas(tx: Prisma.TransactionClient, produtoIds: string[]) {
  const linhas = await tx.receitaItem.findMany({ where: { produtoId: { in: produtoIds } } });
  const porProduto = new Map<string, { insumoId: string; quantidade: number }[]>();
  for (const l of linhas) {
    const lista = porProduto.get(l.produtoId) ?? [];
    lista.push({ insumoId: l.insumoId, quantidade: Number(l.quantidade) });
    porProduto.set(l.produtoId, lista);
  }
  return porProduto;
}

/**
 * Baixa os insumos de uma venda pela ficha técnica de cada produto vendido.
 * Soma por insumo (vários itens usam o mesmo ingrediente) e não bloqueia se faltar:
 * o cliente já consumiu, o saldo apenas fica negativo e aparece no alerta.
 */
export async function baixarInsumosDaVenda(
  tx: Prisma.TransactionClient,
  vendaId: string,
  receitas: Map<string, { insumoId: string; quantidade: number }[]>,
  itens: { productoId: string; cantidad: number }[],
) {
  const porInsumo = new Map<string, number>();
  for (const item of itens) {
    for (const linha of receitas.get(item.productoId) ?? []) {
      porInsumo.set(linha.insumoId, (porInsumo.get(linha.insumoId) ?? 0) + linha.quantidade * item.cantidad);
    }
  }
  for (const [insumoId, total] of Array.from(porInsumo)) {
    await registrarMovimento(tx, {
      insumoId,
      tipo: "SAIDA_VENDA",
      quantidade: -redondear4(total),
      vendaId,
    });
  }
}
