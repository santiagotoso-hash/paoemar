"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SheetContent } from "@/components/ui/sheet";
import { AutorizacaoSupervisor, PIN_LEN } from "../../autorizacao-supervisor";
import { liberarMesa } from "../../actions";

/**
 * Libera uma mesa sem itens (sem cobrança). Se ela teve itens cancelados,
 * pede PIN de supervisor (o servidor confere a mesma regra).
 */
export function LiberarMesaSheet({
  open,
  onOpenChange,
  mesaId,
  titulo,
  precisaSupervisor,
  supervisores,
  onLiberada,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mesaId: string;
  titulo: string;
  precisaSupervisor: boolean;
  supervisores: { id: string; nombre: string }[];
  onLiberada: () => void;
}) {
  const [supervisorId, setSupervisorId] = useState<string | null>(
    supervisores.length === 1 ? supervisores[0].id : null
  );
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const pronto = !precisaSupervisor || (!!supervisorId && pin.length === PIN_LEN);

  async function handleLiberar() {
    if (!pronto) return;
    setLoading(true);
    try {
      const res = await liberarMesa(mesaId, precisaSupervisor ? { supervisorId, pin } : {});
      if (!res.ok) {
        toast.error(res.error);
        setPin("");
        return;
      }
      onOpenChange(false);
      onLiberada();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao liberar a mesa");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  // Autoriza sozinho ao completar o PIN do supervisor.
  useEffect(() => {
    if (precisaSupervisor && pin.length === PIN_LEN && pronto && !loading) void handleLiberar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setPin("");
        onOpenChange(o);
      }}
    >
      <SheetContent>
        <div className="px-4 pb-3 pr-14 pt-3">
          <DialogTitle className="text-xl font-semibold leading-snug">Liberar {titulo}</DialogTitle>
          <DialogDescription>A mesa fica livre de novo, sem cobrança.</DialogDescription>
        </div>

        {precisaSupervisor && (
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
            <p className="rounded-xl bg-accent p-3 text-sm">
              Esta mesa teve itens cancelados. Para liberar, um supervisor precisa autorizar.
            </p>
            <AutorizacaoSupervisor
              supervisores={supervisores}
              supervisorId={supervisorId}
              onSupervisor={setSupervisorId}
              pin={pin}
              onPin={setPin}
              disabled={loading}
            />
          </div>
        )}

        <div className="border-t px-4 py-3">
          <Button size="touch" className="w-full" onClick={handleLiberar} disabled={!pronto || loading}>
            <DoorOpen />
            {loading ? "Liberando..." : `Liberar ${titulo}`}
          </Button>
        </div>
      </SheetContent>
    </Dialog>
  );
}
