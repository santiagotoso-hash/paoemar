import { prisma } from "@/lib/prisma";
import { EstoqueManager } from "./estoque-manager";

export default async function EstoquePage() {
  const [insumos, movimentos] = await Promise.all([
    prisma.insumo.findMany({ orderBy: { nome: "asc" } }),
    prisma.movimentoEstoque.findMany({
      orderBy: { criadoEm: "desc" },
      take: 40,
      include: { insumo: { select: { nome: true, unidade: true } } },
    }),
  ]);

  return (
    <EstoqueManager
      insumos={insumos.map((i) => ({
        id: i.id,
        nome: i.nome,
        unidade: i.unidade,
        estoqueAtual: i.estoqueAtual.toString(),
        estoqueMinimo: i.estoqueMinimo.toString(),
        custoMedio: i.custoMedio.toString(),
        ativo: i.ativo,
      }))}
      movimentos={movimentos.map((m) => ({
        id: m.id,
        insumo: m.insumo.nome,
        unidade: m.insumo.unidade,
        tipo: m.tipo,
        quantidade: m.quantidade.toString(),
        saldoApos: m.saldoApos.toString(),
        motivo: m.motivo,
        criadoEm: m.criadoEm.toISOString(),
      }))}
    />
  );
}
