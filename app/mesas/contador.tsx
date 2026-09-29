"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Contador (− qtd +). Com `onRemover`, o "−" vira lixeira quando o valor chega em `min`.
 * `vazio` é o texto mostrado quando o valor é 0 (ex.: pessoas não informadas).
 */
export function Contador({
  valor,
  onChange,
  onRemover,
  min = 0,
  max = 99,
  nome,
  vazio,
  className,
}: {
  valor: number;
  onChange: (v: number) => void;
  onRemover?: () => void;
  min?: number;
  max?: number;
  /** Usado nos aria-labels: "Diminuir {nome}". */
  nome: string;
  vazio?: string;
  className?: string;
}) {
  const vaiRemover = !!onRemover && valor <= min;

  return (
    <div className={cn("inline-flex items-center gap-1 rounded-xl border bg-card p-0.5", className)}>
      <Button
        variant="ghost"
        size="icon-touch"
        aria-label={vaiRemover ? `Remover ${nome}` : `Diminuir ${nome}`}
        onClick={() => (vaiRemover ? onRemover!() : onChange(valor - 1))}
        disabled={!vaiRemover && valor <= min}
        className={vaiRemover ? "text-destructive hover:text-destructive" : ""}
      >
        {vaiRemover ? <Trash2 /> : <Minus />}
      </Button>
      <span className="min-w-8 text-center text-base font-semibold tabular-nums" aria-live="polite">
        {valor === 0 && vazio ? vazio : valor}
      </span>
      <Button
        variant="ghost"
        size="icon-touch"
        aria-label={`Aumentar ${nome}`}
        onClick={() => onChange(valor + 1)}
        disabled={valor >= max}
      >
        <Plus />
      </Button>
    </div>
  );
}
