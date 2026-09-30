import { Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAtendenteActual } from "@/lib/atendente";
import { voltarSeguro } from "@/lib/inatividade";
import { EntrarForm } from "./entrar-form";

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: { atendente?: string; voltar?: string; motivo?: string };
}) {
  const [atendentes, actual] = await Promise.all([
    prisma.atendente.findMany({
      where: { activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    getAtendenteActual(),
  ]);

  // Depois de inatividade: já vem com o mesmo atendente escolhido.
  const preSelecionado = atendentes.some((a) => a.id === searchParams.atendente)
    ? searchParams.atendente!
    : (actual?.id ?? null);
  const porInatividade = searchParams.motivo === "inatividade";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Quem está atendendo?</h1>
        <p className="text-sm text-muted-foreground">Escolha seu nome e digite seu PIN.</p>
      </div>

      {porInatividade && (
        <p role="status" className="flex items-start gap-2 rounded-xl bg-accent p-3 text-sm">
          <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          Sessão encerrada por inatividade. Digite o PIN para continuar de onde parou.
        </p>
      )}

      {atendentes.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Nenhum atendente cadastrado. Um admin pode criar em Admin → Atendentes.
        </p>
      ) : (
        <EntrarForm
          atendentes={atendentes}
          atendenteActualId={preSelecionado}
          voltar={voltarSeguro(searchParams.voltar)}
        />
      )}
    </div>
  );
}
