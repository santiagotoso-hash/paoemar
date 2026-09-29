import { prisma } from "@/lib/prisma";
import { getAtendenteActual } from "@/lib/atendente";
import { EntrarForm } from "./entrar-form";

export default async function EntrarPage() {
  const [atendentes, actual] = await Promise.all([
    prisma.atendente.findMany({
      where: { activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    getAtendenteActual(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Quem está atendendo?</h1>
        <p className="text-sm text-muted-foreground">Escolha seu nome e digite seu PIN.</p>
      </div>

      {atendentes.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Nenhum atendente cadastrado. Um admin pode criar em Admin → Atendentes.
        </p>
      ) : (
        <EntrarForm atendentes={atendentes} atendenteActualId={actual?.id ?? null} />
      )}
    </div>
  );
}
