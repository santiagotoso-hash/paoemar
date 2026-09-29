"use client";

import { Delete } from "lucide-react";
import { Button } from "@/components/ui/button";

const DIGITOS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** Teclado próprio (PIN e número de mesa): evita abrir o teclado do sistema no celular. */
export function TecladoNumerico({
  onDigito,
  onApagar,
  onLimpar,
  disabled,
}: {
  onDigito: (d: string) => void;
  onApagar: () => void;
  onLimpar: () => void;
  disabled?: boolean;
}) {
  const tecla = "h-14 rounded-xl text-xl font-medium";

  return (
    <div className="grid grid-cols-3 gap-2">
      {DIGITOS.map((d) => (
        <Button key={d} variant="outline" className={tecla} onClick={() => onDigito(d)} disabled={disabled}>
          {d}
        </Button>
      ))}
      <Button variant="ghost" className={`${tecla} text-sm text-muted-foreground`} onClick={onLimpar} disabled={disabled}>
        Limpar
      </Button>
      <Button variant="outline" className={tecla} onClick={() => onDigito("0")} disabled={disabled}>
        0
      </Button>
      <Button variant="ghost" className={tecla} onClick={onApagar} disabled={disabled} aria-label="Apagar">
        <Delete className="size-6" />
      </Button>
    </div>
  );
}
