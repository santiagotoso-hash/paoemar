import { prisma } from "@/lib/prisma";
import { PosManager } from "./pos-manager";

export default async function PosPage() {
  const [productos, categorias] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.categoria.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  const productosSerializados = productos.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    categoriaId: p.categoriaId,
    precio: p.precio.toString(),
    tipoUnidad: p.tipoUnidad,
    stockActual: p.stockActual.toString(),
  }));

  return <PosManager productos={productosSerializados} categorias={categorias} />;
}
