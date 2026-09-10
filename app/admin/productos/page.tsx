import { prisma } from "@/lib/prisma";
import { ProductosManager } from "./productos-manager";

export default async function ProductosPage() {
  const [productos, categorias] = await Promise.all([
    prisma.producto.findMany({ orderBy: { nombre: "asc" } }),
    prisma.categoria.findMany({ orderBy: { nombre: "asc" } }),
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
  }));

  return <ProductosManager productos={productosSerializados} categorias={categorias} />;
}
