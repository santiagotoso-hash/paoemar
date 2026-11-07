import { prisma } from "@/lib/prisma";
import { inicioDoDiaSP } from "@/lib/format";
import { encomendaInclude, encomendaParaEvento } from "@/lib/encomendas";
import { EncomendasManager } from "./encomendas-manager";

export default async function EncomendasPage() {
  const hoje = inicioDoDiaSP();

  const [encomendas, produtosEncomendaveis, clientes] = await Promise.all([
    prisma.encomenda.findMany({
      // Em aberto, mais as retiradas de hoje.
      where: { OR: [{ estado: { not: "ENTREGADO" } }, { estadoDesde: { gte: hoje } }] },
      include: encomendaInclude,
      orderBy: { retiradaEm: "asc" },
    }),
    prisma.producto.findMany({
      where: { activo: true, encomendavel: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, tipoUnidad: true, categoria: { select: { nombre: true } } },
    }),
    prisma.cliente.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, telefone: true },
    }),
  ]);

  const produtos = produtosEncomendaveis.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria.nombre,
    kg: p.tipoUnidad === "KG",
  }));

  return (
    <EncomendasManager encomendas={encomendas.map(encomendaParaEvento)} produtos={produtos} clientes={clientes} />
  );
}
