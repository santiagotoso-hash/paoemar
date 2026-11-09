"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, ChevronDown, Phone, Printer, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EncomendaEvent } from "@/lib/realtime";
import type { ConfigImpressora } from "@/lib/impressoras";
import { imprimirTicket } from "@/lib/impressao";
import { ticketDeEncomenda } from "@/lib/ticket";
import { cn } from "@/lib/utils";
import { formatHora } from "@/lib/format";
import { avanzarEstadoEncomenda } from "./actions";

const COLUMNAS = [
  { estado: "RECIBIDO", label: "Recebida", acao: "Iniciar produção" },
  { estado: "EN_PREPARACION", label: "Em produção", acao: "Marcar pronta" },
  { estado: "LISTO", label: "Pronta", acao: "Marcar retirada" },
] as const;

/** Faltando menos que isso para a retirada (e ainda sem estar pronta), o cartão ganha destaque. */
const URGENTE_MIN = 120;

const FUSO = "America/Sao_Paulo";
const diaChave = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }); // AAAA-MM-DD
const diaCurto = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: FUSO });

/** "Hoje 14:30", "Amanhã 08:00", "sex., 13/11 09:00" */
function rotuloRetirada(iso: string, agora: number) {
  const dia = diaChave.format(new Date(iso));
  const hoje = diaChave.format(new Date(agora));
  const amanha = diaChave.format(new Date(agora + 24 * 60 * 60 * 1000));
  const quando = dia === hoje ? "Hoje" : dia === amanha ? "Amanhã" : diaCurto.format(new Date(iso));
  return `${quando} ${formatHora(iso)}`;
}

function situacao(e: EncomendaEvent, agora: number): "atrasada" | "urgente" | null {
  if (e.estado === "LISTO") return null;
  const faltam = (new Date(e.retiradaEm).getTime() - agora) / 60000;
  if (faltam < 0) return "atrasada";
  return faltam <= URGENTE_MIN ? "urgente" : null;
}

export function FabricaBoard({
  encomendasIniciais,
  entreguesIniciais = [],
  impressora,
}: {
  encomendasIniciais: EncomendaEvent[];
  /** Retiradas hoje (lista recolhida), mais recente primeiro. */
  entreguesIniciais?: EncomendaEvent[];
  /** Impressora da produção (Admin → Impressoras). */
  impressora: ConfigImpressora;
}) {
  /**
   * Reimpressão manual pelo navegador deste aparelho. Os tickets automáticos não saem daqui:
   * quem imprime é o programa da loja (agente-impressao), que lê a fila do servidor.
   */
  function imprimirEncomenda(e: EncomendaEvent) {
    if (!impressora.ativa) {
      toast.error("A impressora da produção está desativada. Ative em Admin → Impressoras.");
      return;
    }
    imprimirTicket(ticketDeEncomenda(e, impressora));
  }

  const [encomendas, setEncomendas] = useState<EncomendaEvent[]>(encomendasIniciais);
  const [entregues, setEntregues] = useState<EncomendaEvent[]>(entreguesIniciais);
  const [verEntregues, setVerEntregues] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const [avancando, setAvancando] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/sse/fabrica");
    source.onmessage = (event) => {
      try {
        const e: EncomendaEvent = JSON.parse(event.data);
        if (e.removida) {
          setEncomendas((prev) => prev.filter((x) => x.id !== e.id));
          return;
        }
        if (e.estado === "ENTREGADO") {
          setEncomendas((prev) => prev.filter((x) => x.id !== e.id));
          setEntregues((prev) => [e, ...prev.filter((x) => x.id !== e.id)]);
          return;
        }
        setEncomendas((prev) =>
          prev.some((x) => x.id === e.id) ? prev.map((x) => (x.id === e.id ? e : x)) : [...prev, e]
        );
      } catch {
        // ignorar mensagens mal formadas
      }
    };
    return () => source.close();
  }, []);

  // Mais cedo primeiro: quem retira antes aparece no topo da coluna.
  const ordenadas = useMemo(
    () => [...encomendas].sort((a, b) => a.retiradaEm.localeCompare(b.retiradaEm)),
    [encomendas]
  );

  async function handleAvanzar(e: EncomendaEvent) {
    if (avancando.has(e.id)) return;
    setAvancando((s) => new Set(s).add(e.id));
    try {
      const res = await avanzarEstadoEncomenda(e.id, e.estado);
      if (!res.ok) toast.error(res.error);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao avançar o status");
    } finally {
      setAvancando((s) => {
        const n = new Set(s);
        n.delete(e.id);
        return n;
      });
    }
  }

  return (
    <div className="flex flex-col gap-3 p-6">
      <h1 className="text-xl font-semibold">Fábrica</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {COLUMNAS.map((col) => {
          const daColuna = ordenadas.filter((e) => e.estado === col.estado);
          return (
            <div key={col.estado} className="flex flex-col gap-3">
              <h2 className="font-semibold">
                {col.label} ({daColuna.length})
              </h2>
              {daColuna.map((e) => {
                const sit = situacao(e, agora);
                return (
                  <Card
                    key={e.id}
                    className={cn(sit === "atrasada" && "ring-2 ring-destructive", sit === "urgente" && "ring-2 ring-primary")}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between gap-2 text-base">
                        <span>{e.codigo}</span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-sm font-medium",
                            sit === "atrasada" && "text-destructive",
                            sit === "urgente" && "text-primary"
                          )}
                        >
                          <CalendarClock className="size-4" aria-hidden />
                          {rotuloRetirada(e.retiradaEm, agora)}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      {sit === "atrasada" && (
                        <p className="inline-flex w-fit items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                          <TriangleAlert className="size-3.5" aria-hidden />
                          Passou do horário de retirada
                        </p>
                      )}
                      <p className="text-sm">
                        <span className="font-medium">{e.nombreCliente}</span>
                        {e.telefone && (
                          <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground">
                            <Phone className="size-3.5" aria-hidden />
                            {e.telefone}
                          </span>
                        )}
                      </p>
                      <ul className="text-sm">
                        {e.items.map((item, idx) => (
                          <li key={idx}>
                            {item.cantidad}x {item.productoNombre}
                            {item.notas ? ` (${item.notas})` : ""}
                          </li>
                        ))}
                      </ul>
                      {e.notas && <p className="rounded-lg bg-accent px-2.5 py-1.5 text-sm">{e.notas}</p>}
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => handleAvanzar(e)} disabled={avancando.has(e.id)}>
                          {avancando.has(e.id) ? "Avançando..." : col.acao}
                        </Button>
                        <Button size="sm" variant="outline" aria-label={`Imprimir ${e.codigo}`} onClick={() => imprimirEncomenda(e)}>
                          <Printer />
                          Imprimir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {daColuna.length === 0 && <p className="text-sm text-muted-foreground">Sem encomendas.</p>}
            </div>
          );
        })}
      </div>

      {/* Retiradas hoje: recolhido por padrão */}
      <section className="mt-4 border-t pt-4" aria-labelledby="retiradas-titulo">
        <button
          type="button"
          onClick={() => setVerEntregues((v) => !v)}
          aria-expanded={verEntregues}
          aria-controls="retiradas-lista"
          className="flex min-h-11 w-full items-center justify-between rounded-xl px-2 text-left hover:bg-muted"
        >
          <h2 id="retiradas-titulo" className="font-semibold">
            Retiradas hoje ({entregues.length})
          </h2>
          <ChevronDown className={cn("size-5 transition-transform", verEntregues && "rotate-180")} aria-hidden />
        </button>

        {verEntregues && (
          <div id="retiradas-lista" className="mt-2">
            {entregues.length === 0 ? (
              <p className="px-2 text-sm text-muted-foreground">Nenhuma encomenda retirada hoje.</p>
            ) : (
              <ul className="flex flex-col divide-y rounded-xl border bg-card">
                {entregues.map((e) => (
                  <li key={e.id} className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:gap-4">
                    <div className="min-w-0 sm:w-56">
                      <p className="truncate text-sm font-medium">{e.codigo}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.nombreCliente} · {e.items.reduce((acc, i) => acc + Number(i.cantidad), 0)} item(ns)
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Combinado {rotuloRetirada(e.retiradaEm, agora)}
                      {e.tempos.entregue && <> · retirada às {formatHora(e.tempos.entregue)}</>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
