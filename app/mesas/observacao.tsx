"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const OBS_MAX = 140;

/** Pedidos mais comuns: um toque adiciona ao texto. */
const SUGESTOES = ["Sem lactose", "Sem açúcar", "Sem glúten", "Sem cebola", "Bem quente", "Gelado", "Para viagem"];

/** Campo de observação para a cozinha, com atalhos. */
export function CampoObservacao({
  id,
  valor,
  onChange,
}: {
  id: string;
  valor: string;
  onChange: (v: string) => void;
}) {
  const partes = valor
    .split(",")
    .map((p) => p.trim().toLocaleLowerCase("pt-BR"))
    .filter(Boolean);

  function alternar(s: string) {
    const chave = s.toLocaleLowerCase("pt-BR");
    const atuais = valor.split(",").map((p) => p.trim()).filter(Boolean);
    const next = partes.includes(chave)
      ? atuais.filter((p) => p.toLocaleLowerCase("pt-BR") !== chave)
      : [...atuais, s];
    onChange(next.join(", ").slice(0, OBS_MAX));
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="font-heading text-base font-semibold">
        Observação para a cozinha
      </Label>
      <div className="flex flex-wrap gap-2" aria-label="Atalhos de observação">
        {SUGESTOES.map((s) => {
          const ativo = partes.includes(s.toLocaleLowerCase("pt-BR"));
          return (
            <button
              key={s}
              type="button"
              aria-pressed={ativo}
              onClick={() => alternar(s)}
              className={cn(
                "min-h-11 rounded-full border px-3 text-sm transition-colors",
                ativo ? "border-primary bg-accent font-medium text-foreground" : "bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              {s}
            </button>
          );
        })}
      </div>
      <Textarea
        id={id}
        value={valor}
        onChange={(e) => onChange(e.target.value.slice(0, OBS_MAX))}
        placeholder="Ex.: sem cebola, bem passado, trocar pão por integral"
        className="min-h-20 rounded-xl text-base"
      />
    </div>
  );
}

/** Bottom sheet para escrever/editar a observação de um item já adicionado. */
export function ObservacaoSheet({
  item,
  onClose,
  onSalvar,
}: {
  item: { chave: string; nombre: string; observacao?: string } | null;
  onClose: () => void;
  onSalvar: (chave: string, observacao: string) => void;
}) {
  const [atual, setAtual] = useState(item);
  const [valor, setValor] = useState(item?.observacao ?? "");

  useEffect(() => {
    if (item) {
      setAtual(item);
      setValor(item.observacao ?? "");
    }
  }, [item]);

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        {atual && (
          <>
            <div className="px-4 pb-3 pr-14 pt-3">
              <DialogTitle className="text-xl font-semibold leading-snug">{atual.nombre}</DialogTitle>
              <DialogDescription>Adicional, troca ou restrição: vai junto para a cozinha.</DialogDescription>
            </div>
            <div className="overflow-y-auto px-4 pb-4">
              <CampoObservacao id="obs-item" valor={valor} onChange={setValor} />
            </div>
            <div className="flex gap-2 border-t px-4 py-3">
              {atual.observacao && (
                <Button size="touch" variant="ghost" onClick={() => onSalvar(atual.chave, "")}>
                  Remover
                </Button>
              )}
              <Button size="touch" className="flex-1" onClick={() => onSalvar(atual.chave, valor)}>
                Salvar observação
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Dialog>
  );
}
