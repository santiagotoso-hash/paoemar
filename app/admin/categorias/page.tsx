import { prisma } from "@/lib/prisma";
import { CategoriasManager } from "./categorias-manager";

export default async function CategoriasPage() {
  const categorias = await prisma.categoria.findMany({ orderBy: { nombre: "asc" } });

  return <CategoriasManager categorias={categorias} />;
}
