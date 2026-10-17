"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TemposPedido, VentaEvent } from "@/lib/realtime";
import { cn } from "@/lib/utils";
import { formatHora } from "@/lib/format";
import { chaveAlerta, estaParado, minutosNoEstado, textoParado } from "@/lib/alertas";
import { avisar, desbloquearAudio, pedirPermissaoNotificacao } from "@/lib/avisos-sonoros";
import { avanzarEstadoRonda, avanzarEstadoVenta } from "./actions";

const COLUMNAS = [
  { estado: "RECIBIDO", label: "Recebido" },
  { estado: "EN_PREPARACION", label: "Em preparo" },
  { estado: "LISTO", label: "Pronto" },
] as const;

const ORIGEN_LABEL: Record<string, string> = {
  MOSTRADOR: "Balcão",
  COMANDA: "Comanda",
  MESA: "Mesa",
};

const ETAPAS: { campo: keyof TemposPedido; label: string }[] = [
  { campo: "lancado", label: "Lançado" },
  { campo: "emPreparo", label: "Preparo" },
  { campo: "pronto", label: "Pronto" },
  { campo: "entregue", label: "Entregue" },
];

function temposDe(v: VentaEvent): TemposPedido {
  return v.tempos ?? { lancado: v.createdAt };
}

/** "Lançado 14:02 · Preparo 14:05 · Pronto 14:15 · Entregue 14:18" (só as etapas que já aconteceram). */
function LinhaDoTempo({ tempos, className }: { tempos: TemposPedido; className?: string }) {
  return (
    <ol className={cn("flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground", className)}>
      {ETAPAS.filter((e) => tempos[e.campo]).map((e, i) => (
        <li key={e.campo} className="whitespace-nowrap">
          {i > 0 && <span aria-hidden>· </span>}
          {e.label} <span className="font-medium tabular-nums text-foreground">{formatHora(tempos[e.campo]!)}</span>
        </li>
      ))}
    </ol>
  );
}

/** Minutos entre lançado e entregue. */
function duracaoTotal(tempos: TemposPedido) {
  if (!tempos.entregue) return null;
  return Math.max(0, Math.round((new Date(tempos.entregue).getTime() - new Date(tempos.lancado).getTime()) / 60000));
}

export function CocinaBoard({
  ventasIniciales,
  entreguesIniciais = [],
}: {
  ventasIniciales: VentaEvent[];
  /** Entregues hoje (lista recolhida), mais recente primeiro. */
  entreguesIniciais?: VentaEvent[];
}) {
  const [ventas, setVentas] = useState<VentaEvent[]>(ventasIniciales);
  const [entregues, setEntregues] = useState<VentaEvent[]>(entreguesIniciais);
  const [verEntregues, setVerEntregues] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const alertados = useRef(new Set<string>());
  const [podeNotificar, setPodeNotificar] = useState(true);

  // Relógio do "pedido parado" + áudio liberado no primeiro toque.
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 15_000);
    window.addEventListener("pointerdown", desbloquearAudio);
    setPodeNotificar(!("Notification" in window) || Notification.permission !== "default");
    return () => {
      clearInterval(t);
      window.removeEventListener("pointerdown", desbloquearAudio);
    };
  }, []);

  // Avisa uma vez por rodada + estado quando passa do limite (lib/alertas.ts).
  useEffect(() => {
    for (const v of ventas) {
      if (!estaParado(v.estado, v.estadoDesde, agora)) continue;
      const chave = chaveAlerta(v.id, v.estado);
      if (alertados.current.has(chave)) continue;
      alertados.current.add(chave);
      const texto = textoParado(v.codigo, v.estado, minutosNoEstado(v.estadoDesde!, agora));
      avisar("Pedido parado", texto, chave);
      toast.warning(texto, { duration: 15_000 });
    }
  }, [ventas, agora]);

  useEffect(() => {
    const source = new EventSource("/api/sse/cocina");
    source.onmessage = (event) => {
      try {
        const venta: VentaEvent = JSON.parse(event.data);
        if (venta.estado === "ENTREGADO") {
          setVentas((prev) => prev.filter((v) => v.id !== venta.id));
          // Sem itens = rodada cancelada inteira: some de vez, não vai para "Entregues".
          setEntregues((prev) => {
            const sem = prev.filter((v) => v.id !== venta.id);
            return venta.items.length > 0 ? [venta, ...sem] : sem;
          });
          return;
        }
        setVentas((prev) => {
          const existe = prev.some((v) => v.id === venta.id);
          if (existe) return prev.map((v) => (v.id === venta.id ? venta : v));
          return [...prev, venta];
        });
      } catch {
        // ignorar mensagens mal formadas
      }
    };
    return () => source.close();
  }, []);

  // Pedidos com um "Avançar" em andamento: o botão fica desativado (evita toque duplo).
  const [avancando, setAvancando] = useState<Set<string>>(new Set());

  async function handleAvanzar(v: VentaEvent) {
    if (avancando.has(v.id)) return;
    setAvancando((s) => new Set(s).add(v.id));
    try {
      const res = await (v.origen === "MESA"
        ? avanzarEstadoRonda(v.id, v.estado)
        : avanzarEstadoVenta(v.id, v.estado));
      if (!res.ok) toast.error(res.error);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao avançar o status");
    } finally {
      setAvancando((s) => {
        const n = new Set(s);
        n.delete(v.id);
        return n;
      });
    }
  }

  return (
    <div className="flex flex-col gap-3 p-6">
      {!podeNotificar && (
        <Button
          variant="outline"
          size="sm"
          className="self-end"
          onClick={async () => {
            await pedirPermissaoNotificacao();
            setPodeNotificar(true);
          }}
        >
          <BellRing />
          Ativar alertas de pedido parado
        </Button>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {COLUMNAS.map((col) => (
          <div key={col.estado} className="flex flex-col gap-3">
            <h2 className="font-semibold">{col.label}</h2>
            {ventas
              .filter((v) => v.estado === col.estado)
              .map((v) => {
                const parado = estaParado(v.estado, v.estadoDesde, agora);
                return (
                  <Card key={v.id} className={cn(parado && "ring-2 ring-destructive")}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-base">
                        <span>{v.codigo}</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          {ORIGEN_LABEL[v.origen] ?? v.origen}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      {parado && (
                        <p className="inline-flex w-fit items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                          <BellRing className="size-3.5" aria-hidden />
                          Parado há {minutosNoEstado(v.estadoDesde!, agora)} min
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">{v.nombreCliente}</p>
                      <ul className="text-sm">
                        {v.items.map((item, idx) => (
                          <li key={idx}>
                            {item.cantidad}x {item.productoNombre}
                            {item.notas ? ` (${item.notas})` : ""}
                          </li>
                        ))}
                      </ul>
                      <LinhaDoTempo tempos={temposDe(v)} />
                      <Button size="sm" onClick={() => handleAvanzar(v)} disabled={avancando.has(v.id)}>
                        {avancando.has(v.id)
                          ? "Avançando..."
                          : col.estado === "LISTO"
                            ? "Marcar entregue"
                            : "Avançar"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            {ventas.filter((v) => v.estado === col.estado).length === 0 && (
              <p className="text-sm text-muted-foreground">Sem pedidos.</p>
            )}
          </div>
        ))}
      </div>

      {/* Entregues hoje: recolhido por padrão */}
      <section className="mt-4 border-t pt-4" aria-labelledby="entregues-titulo">
        <button
          type="button"
          onClick={() => setVerEntregues((v) => !v)}
          aria-expanded={verEntregues}
          aria-controls="entregues-lista"
          className="flex min-h-11 w-full items-center justify-between rounded-xl px-2 text-left hover:bg-muted"
        >
          <h2 id="entregues-titulo" className="font-semibold">
            Entregues hoje ({entregues.length})
          </h2>
          <ChevronDown className={cn("size-5 transition-transform", verEntregues && "rotate-180")} aria-hidden />
        </button>

        {verEntregues && (
          <div id="entregues-lista" className="mt-2">
            {entregues.length === 0 ? (
              <p className="px-2 text-sm text-muted-foreground">Nenhum pedido entregue hoje.</p>
            ) : (
              <ul className="flex flex-col divide-y rounded-xl border bg-card">
                {entregues.map((v) => {
                  const tempos = temposDe(v);
                  const total = duracaoTotal(tempos);
                  return (
                    <li key={v.id} className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:gap-4">
                      <div className="min-w-0 sm:w-56">
                        <p className="truncate text-sm font-medium">{v.codigo}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {ORIGEN_LABEL[v.origen] ?? v.origen} · {v.nombreCliente} ·{" "}
                          {v.items.reduce((acc, i) => acc + Number(i.cantidad), 0)} item(ns)
                        </p>
                      </div>
                      <LinhaDoTempo tempos={tempos} className="flex-1" />
                      {total !== null && (
                        <span className="shrink-0 text-xs font-semibold tabular-nums">{total} min no total</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
