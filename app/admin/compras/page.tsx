import { prisma } from "@/lib/prisma";
import { ComprasManager } from "./compras-manager";

export default async function ComprasPage() {
  const [compras, fornecedores, insumos] = await Promise.all([
    prisma.compra.findMany({
      orderBy: { emitidaEm: "desc" },
      take: 50,
      include: { fornecedor: { select: { nome: true } }, _count: { select: { itens: true } } },
    }),
    prisma.fornecedor.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.insumo.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <ComprasManager
      compras={compras.map((c) => ({
        id: c.id,
        fornecedor: c.fornecedor.nome,
        numero: c.numero,
        serie: c.serie,
        emitidaEm: c.emitidaEm.toISOString(),
        total: c.total.toString(),
        origem: c.origem,
        itens: c._count.itens,
      }))}
      fornecedores={fornecedores.map((f) => ({ id: f.id, nome: f.nome, cnpj: f.cnpj }))}
      insumos={insumos.map((i) => ({ id: i.id, nome: i.nome, unidade: i.unidade }))}
    />
  );
}
