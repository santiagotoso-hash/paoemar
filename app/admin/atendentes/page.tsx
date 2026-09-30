import { prisma } from "@/lib/prisma";
import { AtendentesManager } from "./atendentes-manager";

export default async function AtendentesPage() {
  const atendentes = await prisma.atendente.findMany({
    select: { id: true, nombre: true, activo: true, supervisor: true },
    orderBy: { nombre: "asc" },
  });

  return <AtendentesManager atendentes={atendentes} />;
}
