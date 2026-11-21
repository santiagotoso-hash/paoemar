import { prisma } from "@/lib/prisma";
import { PosManager } from "./pos-manager";

export default async function PosPage() {
  const [productos, categorias] = await Promise.all([
    prisma.producto.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      include: {
        adicionais: { orderBy: { nombre: "asc" } },
        gruposOpcion: { orderBy: { orden: "asc" }, include: { opciones: { orderBy: { orden: "asc" } } } },
      },
    }),
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
    adicionais: p.adicionais.map((a) => ({ id: a.id, nombre: a.nombre, precio: Number(a.precio) })),
    grupos: p.gruposOpcion.map((g) => ({
      id: g.id,
      nombre: g.nombre,
      obligatorio: g.obligatorio,
      opciones: g.opciones.map((o) => ({ id: o.id, nombre: o.nombre, precio: Number(o.precio) })),
    })),
  }));

  return <PosManager productos={productosSerializados} categorias={categorias} />;
}
