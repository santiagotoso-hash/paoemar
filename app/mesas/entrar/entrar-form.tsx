"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AvatarAtendente } from "../avatar-atendente";
import { TecladoNumerico } from "../teclado-numerico";
import { entrarAtendente } from "../actions";

const PIN_LEN = 4;

type Atendente = { id: string; nombre: string };

export function EntrarForm({
  atendentes,
  atendenteActualId,
  voltar = "/mesas",
}: {
  atendentes: Atendente[];
  atendenteActualId: string | null;
  /** Tela para onde voltar depois do PIN (ex.: após inatividade). */
  voltar?: string;
}) {
  const router = useRouter();
  const [atendenteId, setAtendenteId] = useState<string | null>(
    atendenteActualId ?? (atendentes.length === 1 ? atendentes[0].id : null)
  );
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const pronto = !!atendenteId && pin.length === PIN_LEN;

  function digitar(d: string) {
    setPin((p) => (p.length < PIN_LEN ? p + d : p));
  }

  // Teclado físico também funciona (útil no computador do caixa).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (/^\d$/.test(e.key)) digitar(e.key);
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleEntrar() {
    if (!pronto) return;
    setLoading(true);
    try {
      const res = await entrarAtendente({ atendenteId, pin });
      if (!res.ok) {
        toast.error(res.error);
        setPin("");
        return;
      }
      router.push(voltar);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao entrar");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  const selecionado = atendentes.find((a) => a.id === atendenteId);

  return (
    <div className="flex flex-col gap-6">
      <div role="radiogroup" aria-label="Atendente" className="flex flex-col gap-2">
        {atendentes.map((a) => {
          const ativo = a.id === atendenteId;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => {
                setAtendenteId(a.id);
                setPin("");
              }}
              className={cn(
                "flex min-h-14 items-center gap-3 rounded-2xl border bg-card px-3 py-2 text-left transition-colors",
                ativo ? "border-primary bg-accent ring-1 ring-primary" : "hover:bg-muted"
              )}
            >
              <AvatarAtendente nombre={a.nombre} className={ativo ? "bg-primary text-primary-foreground" : ""} />
              <span className="font-medium">{a.nombre}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-muted-foreground">
          {selecionado ? `PIN de ${selecionado.nombre}` : "Escolha seu nome acima"}
        </p>
        <div className="flex gap-3" aria-label={`${pin.length} de ${PIN_LEN} dígitos`} role="status">
          {Array.from({ length: PIN_LEN }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "size-4 rounded-full border-2 border-primary transition-colors",
                i < pin.length ? "bg-primary" : "bg-transparent"
              )}
            />
          ))}
        </div>
      </div>

      <TecladoNumerico
        onDigito={digitar}
        onApagar={() => setPin((p) => p.slice(0, -1))}
        onLimpar={() => setPin("")}
        disabled={!atendenteId || loading}
      />

      <Button size="touch" className="w-full" onClick={handleEntrar} disabled={!pronto || loading}>
        {loading ? "Entrando..." : "Entrar"}
      </Button>
    </div>
  );
}
