"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { chaveMesa, nomeMesa } from "@/lib/mesas";
import { TecladoNumerico } from "../../teclado-numerico";
import { Contador } from "../../contador";
import { abrirMesa } from "../../actions";

type Tipo = "NUMERO" | "NOMBRE";
type Aberta = { id: string; codigo: string; tipo: Tipo };

const MAX_DIGITOS = 3;

export function AbrirMesaForm({
  abertas,
  lugares,
  tipoInicial,
  rotuloInicial,
}: {
  abertas: Aberta[];
  lugares: string[];
  tipoInicial: Tipo;
  rotuloInicial: string;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<Tipo>(tipoInicial);
  const [numero, setNumero] = useState(tipoInicial === "NUMERO" ? rotuloInicial : "");
  const [nome, setNome] = useState(tipoInicial === "NOMBRE" ? rotuloInicial : "");
  const [pessoas, setPessoas] = useState(0);
  const [loading, setLoading] = useState(false);
  // Se o servidor encontrar uma mesa aberta que a lista local ainda não tinha.
  const [existenteServidor, setExistenteServidor] = useState<Aberta | null>(null);

  const rotulo = (tipo === "NUMERO" ? numero : nome).trim();
  const existente =
    abertas.find((a) => rotulo && chaveMesa(a.codigo) === chaveMesa(rotulo)) ??
    (existenteServidor && chaveMesa(existenteServidor.codigo) === chaveMesa(rotulo) ? existenteServidor : null);
  const titulo = rotulo ? nomeMesa(tipo, rotulo) : "";

  function digitar(d: string) {
    setNumero((n) => {
      if (n.length >= MAX_DIGITOS) return n;
      if (n === "" && d === "0") return n; // sem zero à esquerda
      return n + d;
    });
  }

  // No modo número, o teclado físico também funciona.
  useEffect(() => {
    if (tipo !== "NUMERO") return;
    function onKey(e: KeyboardEvent) {
      if (/^\d$/.test(e.key)) digitar(e.key);
      else if (e.key === "Backspace") setNumero((n) => n.slice(0, -1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tipo]);

  async function handleAbrir() {
    if (!rotulo || existente) return;
    setLoading(true);
    try {
      const res = await abrirMesa({ tipo, rotulo, personas: pessoas || undefined });
      if (!res.ok) {
        if (res.existente) setExistenteServidor(res.existente);
        else toast.error(res.error);
        return;
      }
      router.push(`/mesas/${res.id}/lancar`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao abrir a mesa");
    } finally {
      setLoading(false);
    }
  }

  const abertasPorChave = new Set(abertas.map((a) => chaveMesa(a.codigo)));

  return (
    <>
      <div role="radiogroup" aria-label="Identificar mesa" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(
          [
            ["NUMERO", "Por número"],
            ["NOMBRE", "Por nome"],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={tipo === t}
            onClick={() => setTipo(t)}
            className={cn(
              "min-h-11 rounded-lg text-sm font-medium transition-colors",
              tipo === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tipo === "NUMERO" ? (
        <div className="flex flex-col gap-4">
          <div
            className="flex h-24 flex-col items-center justify-center rounded-2xl border bg-card"
            aria-live="polite"
          >
            <span className="text-xs text-muted-foreground">Mesa</span>
            <span className={cn("font-heading text-5xl font-semibold", !numero && "text-muted-foreground/40")}>
              {numero || "—"}
            </span>
          </div>
          <TecladoNumerico
            onDigito={digitar}
            onApagar={() => setNumero((n) => n.slice(0, -1))}
            onLimpar={() => setNumero("")}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome-mesa">Nome da mesa</Label>
            <Input
              id="nome-mesa"
              value={nome}
              onChange={(e) => setNome(e.target.value.slice(0, 40))}
              placeholder="Ex.: Varanda, Balcão 1"
              className="h-11 rounded-xl text-base"
              autoComplete="off"
            />
          </div>
          {lugares.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Lugares da casa">
              {lugares.map((l) => {
                const ocupado = abertasPorChave.has(chaveMesa(l));
                const ativo = chaveMesa(l) === chaveMesa(nome);
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setNome(l)}
                    aria-pressed={ativo}
                    className={cn(
                      "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                      ativo ? "border-primary bg-accent text-foreground" : "bg-card hover:bg-muted",
                      ocupado && !ativo && "text-muted-foreground"
                    )}
                  >
                    {l}
                    {ocupado && <span className="ml-1 text-xs">· ocupada</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {existente && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-primary/40 bg-accent p-4">
          <p className="flex items-start gap-2 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <strong>{nomeMesa(existente.tipo, existente.codigo)}</strong> já está aberta.
            </span>
          </p>
          <Button
            size="touch"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/mesas/${existente.id}`} />}
          >
            Ir para a comanda da {nomeMesa(existente.tipo, existente.codigo)}
            <ArrowRight />
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-3">
        <div>
          <p className="text-sm font-medium">Pessoas</p>
          <p className="text-xs text-muted-foreground">Opcional</p>
        </div>
        <Contador valor={pessoas} onChange={setPessoas} nome="pessoas" vazio="—" />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-md px-4 py-3">
          <Button size="touch" className="w-full" onClick={handleAbrir} disabled={!rotulo || !!existente || loading}>
            {loading ? "Abrindo..." : rotulo ? `Abrir ${titulo} e lançar itens` : "Informe a mesa"}
          </Button>
        </div>
      </div>
    </>
  );
}
