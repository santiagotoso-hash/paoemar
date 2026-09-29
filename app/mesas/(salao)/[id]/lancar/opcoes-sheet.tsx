"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { Contador } from "../../../contador";
import { CampoObservacao } from "../../../observacao";
import { chavePendente, type ItemPendente } from "../../../pendentes";
import type { ProdutoMesa } from "./lancar-itens";

export function OpcoesSheet({
  produto,
  onClose,
  onAdicionar,
}: {
  produto: ProdutoMesa | null;
  onClose: () => void;
  onAdicionar: (item: ItemPendente) => void;
}) {
  // Mantém o último produto montado durante a animação de saída.
  const [atual, setAtual] = useState(produto);
  useEffect(() => {
    if (produto) setAtual(produto);
  }, [produto]);

  return (
    <Dialog open={!!produto} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>{atual && <OpcoesForm key={atual.id} produto={atual} onAdicionar={onAdicionar} />}</SheetContent>
    </Dialog>
  );
}

function OpcoesForm({
  produto,
  onAdicionar,
}: {
  produto: ProdutoMesa;
  onAdicionar: (item: ItemPendente) => void;
}) {
  // grupoId -> opcionId
  const [escolhas, setEscolhas] = useState<Record<string, string>>({});
  const [adicionais, setAdicionais] = useState<Set<string>>(new Set());
  const [observacao, setObservacao] = useState("");
  const [qtd, setQtd] = useState(1);

  const opcoesEscolhidas = produto.grupos.flatMap((g) => {
    const o = g.opciones.find((o) => o.id === escolhas[g.id]);
    return o ? [o] : [];
  });
  const adicionaisEscolhidos = produto.adicionais.filter((a) => adicionais.has(a.id));
  const faltaObrigatorio = produto.grupos.some((g) => g.obligatorio && !escolhas[g.id]);

  const precoUnit = produto.precio + opcoesEscolhidas.reduce((acc, o) => acc + o.precio, 0);
  const total = (precoUnit + adicionaisEscolhidos.reduce((acc, a) => acc + a.precio, 0)) * qtd;

  function toggleAdicional(id: string) {
    setAdicionais((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdicionar() {
    if (faltaObrigatorio) return;
    const obs = observacao.trim() || undefined;
    onAdicionar({
      chave: chavePendente(
        produto.id,
        opcoesEscolhidas.map((o) => o.id),
        adicionaisEscolhidos.map((a) => a.id),
        obs
      ),
      productoId: produto.id,
      nombre: produto.nombre,
      opcion: opcoesEscolhidas.length
        ? {
            ids: opcoesEscolhidas.map((o) => o.id),
            nombre: opcoesEscolhidas.map((o) => o.nombre).join(" · "),
            precio: opcoesEscolhidas.reduce((acc, o) => acc + o.precio, 0),
          }
        : undefined,
      adicionais: adicionaisEscolhidos,
      observacao: obs,
      qtd,
      precoUnit,
    });
  }

  return (
    <>
      <div className="px-4 pb-3 pr-14 pt-3">
        <DialogTitle className="text-xl font-semibold leading-snug">{produto.nombre}</DialogTitle>
        <DialogDescription>{formatBRL(produto.precio)}</DialogDescription>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
        {produto.grupos.map((g) => (
          <fieldset key={g.id} className="flex flex-col gap-2">
            <legend className="mb-2 flex w-full items-center justify-between gap-2">
              <span className="font-heading text-base font-semibold">Escolha: {g.nombre.toLocaleLowerCase("pt-BR")}</span>
              {g.obligatorio && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    escolhas[g.id] ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                  )}
                >
                  {escolhas[g.id] ? "OK" : "Obrigatório"}
                </span>
              )}
            </legend>
            <div role="radiogroup" aria-label={g.nombre} className="flex flex-col divide-y rounded-2xl border">
              {g.opciones.map((o) => {
                const ativo = escolhas[g.id] === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => setEscolhas((prev) => ({ ...prev, [g.id]: o.id }))}
                    className={cn(
                      "flex min-h-12 items-center gap-3 px-3 text-left text-sm first:rounded-t-2xl last:rounded-b-2xl",
                      ativo && "bg-accent"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                        ativo ? "border-primary" : "border-border"
                      )}
                    >
                      {ativo && <span className="size-2.5 rounded-full bg-primary" />}
                    </span>
                    <span className="flex-1 font-medium">{o.nombre}</span>
                    {o.precio > 0 && <span className="text-muted-foreground">+ {formatBRL(o.precio)}</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        {produto.adicionais.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 flex w-full items-center justify-between gap-2">
              <span className="font-heading text-base font-semibold">Adicionais</span>
              <span className="text-xs text-muted-foreground">Opcional</span>
            </legend>
            <div className="flex flex-col divide-y rounded-2xl border">
              {produto.adicionais.map((a) => {
                const ativo = adicionais.has(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="checkbox"
                    aria-checked={ativo}
                    onClick={() => toggleAdicional(a.id)}
                    className={cn(
                      "flex min-h-12 items-center gap-3 px-3 text-left text-sm first:rounded-t-2xl last:rounded-b-2xl",
                      ativo && "bg-accent"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "inline-flex size-5 shrink-0 items-center justify-center rounded-md border-2",
                        ativo ? "border-primary bg-primary text-primary-foreground" : "border-border"
                      )}
                    >
                      {ativo && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                    <span className="flex-1 font-medium">{a.nombre}</span>
                    <span className="text-muted-foreground">+ {formatBRL(a.precio)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <CampoObservacao id="obs-cozinha" valor={observacao} onChange={setObservacao} />
      </div>

      <div className="flex items-center gap-3 border-t px-4 py-3">
        <Contador valor={qtd} onChange={setQtd} min={1} nome="quantidade" />
        <Button size="touch" className="flex-1" onClick={handleAdicionar} disabled={faltaObrigatorio}>
          {faltaObrigatorio ? "Escolha uma opção" : `Adicionar · ${formatBRL(total)}`}
        </Button>
      </div>
    </>
  );
}
