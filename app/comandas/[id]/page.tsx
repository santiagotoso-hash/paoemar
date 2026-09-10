import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ComandaDetail } from "./comanda-detail";

export default async function ComandaDetailPage({ params }: { params: { id: string } }) {
  const comanda = await prisma.comanda.findUnique({
    where: { id: params.id },
    include: { items: { include: { producto: true }, orderBy: { id: "asc" } } },
  });
  if (!comanda) notFound();

  const productos = await prisma.producto.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });

  return (
    <ComandaDetail
      comanda={{
        id: comanda.id,
        codigo: comanda.codigo,
        nombreCliente: comanda.nombreCliente,
        estado: comanda.estado,
      }}
      items={comanda.items.map((i) => ({
        id: i.id,
        productoNombre: i.producto.nombre,
        cantidad: i.cantidad.toString(),
        precioUnit: i.precioUnit.toString(),
        notas: i.notas,
      }))}
      productos={productos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        precio: p.precio.toString(),
        tipoUnidad: p.tipoUnidad,
      }))}
    />
  );
}
