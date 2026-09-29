"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBRL, tempoDesde } from "@/lib/format";
import { usePendentesPorMesa } from "../pendentes";

export type MesaCard = {
  tipo: "NUMERO" | "NOMBRE";
  rotulo: string;
} & (
  | { comandaId: string; abertaEm: string; total: number; qtdItens: number }
  | { comandaId: null }
);

type Filtro = "todas" | "ocupadas" | "livres";

function hrefAbrir(m: MesaCard) {
  const params = new URLSearchParams({ tipo: m.tipo, rotulo: m.rotulo });
  return `/mesas/abrir?${params}`;
}

export function MesasGrid({ mesas }: { mesas: MesaCard[] }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [agora, setAgora] = useState(() => Date.now());

  // Atualiza o "há X min" e busca mesas abertas por outros atendentes.
  useEffect(() => {
    const t = setInterval(() => {
      setAgora(Date.now());
      router.refresh();
    }, 30_000);
    return () => clearInterval(t);
  }, [router]);

  const ocupadas = mesas.filter((m) => m.comandaId);
  const pendentes = usePendentesPorMesa(ocupadas.map((m) => m.comandaId!));

  const visiveis = mesas.filter((m) =>
    filtro === "todas" ? true : filtro === "ocupadas" ? m.comandaId : !m.comandaId
  );

  const filtros: { id: Filtro; label: string }[] = [
    { id: "todas", label: "Todas" },
    { id: "ocupadas", label: `Ocupadas (${ocupadas.length})` },
    { id: "livres", label: `Livres (${mesas.length - ocupadas.length})` },
  ];

  return (
    <>
      <div role="group" aria-label="Filtrar mesas" className="flex gap-2 overflow-x-auto">
        {filtros.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filtro === f.id}
            onClick={() => setFiltro(f.id)}
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
              filtro === f.id
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {filtro === "ocupadas" ? "Nenhuma mesa ocupada." : "Nenhuma mesa livre."}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {visiveis.map((m) => (
            <li key={m.comandaId ?? `livre:${m.rotulo}`}>
              {m.comandaId ? (
                <Link
                  href={`/mesas/${m.comandaId}`}
                  className="flex min-h-32 flex-col gap-1 rounded-2xl border border-primary/25 bg-accent p-3 transition-colors hover:border-primary/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Rotulo tipo={m.tipo} rotulo={m.rotulo} />
                    {pendentes[m.comandaId] > 0 && (
                      <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                        A lançar
                      </span>
                    )}
                  </div>
                  <span className="mt-auto text-lg font-semibold">{formatBRL(m.total)}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.qtdItens} {m.qtdItens === 1 ? "item" : "itens"} · {tempoDesde(m.abertaEm, agora)}
                  </span>
                </Link>
              ) : (
                <Link
                  href={hrefAbrir(m)}
                  className="flex min-h-32 flex-col gap-1 rounded-2xl border-2 border-dashed p-3 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-card"
                >
                  <Rotulo tipo={m.tipo} rotulo={m.rotulo} />
                  <span className="mt-auto text-xs">Livre · Toque para abrir</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-md px-4 py-3">
          <Button size="touch" className="w-full" nativeButton={false} render={<Link href="/mesas/abrir" />}>
            <Plus />
            Abrir mesa
          </Button>
        </div>
      </div>
    </>
  );
}

function Rotulo({ tipo, rotulo }: { tipo: MesaCard["tipo"]; rotulo: string }) {
  if (tipo === "NUMERO") {
    return (
      <span className="flex flex-col leading-none">
        <span className="text-xs text-muted-foreground">Mesa</span>
        <span className="font-heading text-3xl font-semibold text-foreground">{rotulo}</span>
      </span>
    );
  }
  return (
    <span className="line-clamp-2 break-words font-heading text-xl font-semibold leading-tight text-foreground">
      {rotulo}
    </span>
  );
}
