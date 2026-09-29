import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LancarItens, type ProdutoMesa } from "./lancar-itens";

export default async function LancarPage({ params }: { params: { id: string } }) {
  const comanda = await prisma.comanda.findUnique({
    where: { id: params.id },
    select: { id: true, codigo: true, tipo: true, personas: true, estado: true },
  });
  if (!comanda) notFound();
  if (comanda.estado !== "ABIERTA") redirect("/mesas");

  const [categorias, productos] = await Promise.all([
    prisma.categoria.findMany({ orderBy: { nombre: "asc" } }),
    // Produtos por kg ficam de fora: no salão tudo é lançado por unidade.
    prisma.producto.findMany({
      where: { activo: true, tipoUnidad: "UNIDAD" },
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        precio: true,
        categoriaId: true,
        adicionais: { select: { id: true, nombre: true, precio: true }, orderBy: { nombre: "asc" } },
        gruposOpcion: {
          orderBy: { orden: "asc" },
          select: {
            id: true,
            nombre: true,
            obligatorio: true,
            opciones: { orderBy: { orden: "asc" }, select: { id: true, nombre: true, precio: true } },
          },
        },
      },
    }),
  ]);

  const produtos: ProdutoMesa[] = productos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    precio: Number(p.precio),
    categoriaId: p.categoriaId,
    adicionais: p.adicionais.map((a) => ({ id: a.id, nombre: a.nombre, precio: Number(a.precio) })),
    grupos: p.gruposOpcion.map((g) => ({
      id: g.id,
      nombre: g.nombre,
      obligatorio: g.obligatorio,
      opciones: g.opciones.map((o) => ({ id: o.id, nombre: o.nombre, precio: Number(o.precio) })),
    })),
  }));

  const comProdutos = new Set(produtos.map((p) => p.categoriaId));

  return (
    <LancarItens
      mesa={{ id: comanda.id, codigo: comanda.codigo, tipo: comanda.tipo, personas: comanda.personas }}
      categorias={categorias
        .filter((c) => comProdutos.has(c.id))
        .map((c) => ({ id: c.id, nombre: c.nombre, icono: c.icono }))}
      produtos={produtos}
    />
  );
}
