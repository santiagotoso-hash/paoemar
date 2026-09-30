"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { Contador } from "../../contador";
import { AutorizacaoSupervisor, PIN_LEN } from "../../autorizacao-supervisor";
import { cancelarItem } from "../../actions";
import type { ItemLancado } from "./comanda-mesa";

const MOTIVOS = ["Lançado errado", "Lançado em duplicidade", "Cliente desistiu", "Item em falta", "Demora na entrega"];

/** Cancelar item já lançado: quantidade, motivo e PIN de supervisor. */
export function CancelarItemSheet({
  item,
  mesaId,
  supervisores,
  onClose,
  onCancelado,
}: {
  item: ItemLancado | null;
  mesaId: string;
  supervisores: { id: string; nombre: string }[];
  onClose: () => void;
  onCancelado: () => void;
}) {
  // Mantém o item montado durante a animação de saída.
  const [atual, setAtual] = useState(item);
  useEffect(() => {
    if (item) setAtual(item);
  }, [item]);

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        {atual && (
          <CancelarForm
            key={atual.id}
            item={atual}
            mesaId={mesaId}
            supervisores={supervisores}
            onCancelado={onCancelado}
          />
        )}
      </SheetContent>
    </Dialog>
  );
}

function CancelarForm({
  item,
  mesaId,
  supervisores,
  onCancelado,
}: {
  item: ItemLancado;
  mesaId: string;
  supervisores: { id: string; nombre: string }[];
  onCancelado: () => void;
}) {
  const [qtd, setQtd] = useState(item.qtd);
  const [motivo, setMotivo] = useState("");
  const [supervisorId, setSupervisorId] = useState<string | null>(
    supervisores.length === 1 ? supervisores[0].id : null
  );
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const valor = (item.total / item.qtd) * qtd;
  const pronto = motivo.trim().length >= 5 && !!supervisorId && pin.length === PIN_LEN;

  async function handleCancelar() {
    if (!pronto) return;
    setLoading(true);
    try {
      const res = await cancelarItem(mesaId, { itemId: item.id, cantidad: qtd, motivo, supervisorId, pin });
      if (!res.ok) {
        toast.error(res.error);
        setPin("");
        return;
      }
      toast.success(`${qtd}× ${item.nombre} cancelado`);
      onCancelado();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cancelar o item");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="px-4 pb-3 pr-14 pt-3">
        <DialogTitle className="text-xl font-semibold leading-snug">Cancelar item</DialogTitle>
        <DialogDescription>
          {item.qtd}× {item.nombre} · {formatBRL(item.total)}
        </DialogDescription>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
        {item.qtd > 1 && (
          <div className="flex items-center justify-between gap-3">
            <p className="font-heading text-base font-semibold">Quantidade a cancelar</p>
            <Contador valor={qtd} onChange={setQtd} min={1} max={item.qtd} nome="quantidade a cancelar" />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="motivo-cancelamento" className="font-heading text-base font-semibold">
            Motivo <span className="font-sans text-xs font-normal text-muted-foreground">(obrigatório)</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {MOTIVOS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={motivo === m}
                onClick={() => setMotivo(m)}
                className={cn(
                  "min-h-11 rounded-full border px-3 text-sm transition-colors",
                  motivo === m ? "border-primary bg-accent font-medium" : "bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <Textarea
            id="motivo-cancelamento"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value.slice(0, 300))}
            placeholder="Explique o que aconteceu"
            className="min-h-20 rounded-xl text-base"
          />
        </div>

        <AutorizacaoSupervisor
          supervisores={supervisores}
          supervisorId={supervisorId}
          onSupervisor={setSupervisorId}
          pin={pin}
          onPin={setPin}
          disabled={loading}
        />
      </div>

      <div className="border-t px-4 py-3">
        <Button size="touch" variant="destructive" className="w-full" onClick={handleCancelar} disabled={!pronto || loading}>
          <Trash2 />
          {loading ? "Cancelando..." : `Cancelar ${qtd}× · ${formatBRL(valor)}`}
        </Button>
      </div>
    </>
  );
}
