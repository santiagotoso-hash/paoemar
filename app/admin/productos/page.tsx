import { prisma } from "@/lib/prisma";
import { ProductosManager } from "./productos-manager";

export default async function ProductosPage() {
  const [productos, categorias, insumos] = await Promise.all([
    prisma.producto.findMany({ orderBy: { nombre: "asc" }, include: { receita: true } }),
    prisma.categoria.findMany({ orderBy: { nombre: "asc" } }),
    prisma.insumo.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  const productosSerializados = productos.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    categoriaId: p.categoriaId,
    precio: p.precio.toString(),
    tipoUnidad: p.tipoUnidad,
    descripcion: p.descripcion,
    stockActual: p.stockActual.toString(),
    stockMinimo: p.stockMinimo.toString(),
    activo: p.activo,
    encomendavel: p.encomendavel,
    imprimirCozinha: p.imprimirCozinha,
    imprimirProducao: p.imprimirProducao,
    receita: p.receita.map((r) => ({ insumoId: r.insumoId, quantidade: r.quantidade.toString() })),
  }));

  const insumosSerializados = insumos.map((i) => ({
    id: i.id,
    nome: i.nome,
    unidade: i.unidade,
    custoMedio: i.custoMedio.toString(),
  }));

  return <ProductosManager productos={productosSerializados} categorias={categorias} insumos={insumosSerializados} />;
}
