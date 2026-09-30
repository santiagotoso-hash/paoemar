"use client";

import { cn } from "@/lib/utils";
import { AvatarAtendente } from "./avatar-atendente";
import { TecladoNumerico } from "./teclado-numerico";

export const PIN_LEN = 4;

/** Escolha do supervisor + PIN dele (cancelar item, liberar mesa). */
export function AutorizacaoSupervisor({
  supervisores,
  supervisorId,
  onSupervisor,
  pin,
  onPin,
  disabled,
}: {
  supervisores: { id: string; nombre: string }[];
  supervisorId: string | null;
  onSupervisor: (id: string) => void;
  pin: string;
  onPin: (updater: (p: string) => string) => void;
  disabled?: boolean;
}) {
  const supervisor = supervisores.find((s) => s.id === supervisorId);

  return (
    <div className="flex flex-col gap-2">
      <p className="font-heading text-base font-semibold">Autorização do supervisor</p>
      {supervisores.length === 0 ? (
        <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
          Nenhum supervisor cadastrado. Um admin pode marcar em Admin → Atendentes.
        </p>
      ) : (
        <>
          <div role="radiogroup" aria-label="Supervisor" className="flex flex-wrap gap-2">
            {supervisores.map((s) => {
              const ativo = s.id === supervisorId;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => {
                    onSupervisor(s.id);
                    onPin(() => "");
                  }}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-medium transition-colors",
                    ativo ? "border-primary bg-accent ring-1 ring-primary" : "bg-card hover:bg-muted"
                  )}
                >
                  <AvatarAtendente
                    nombre={s.nombre}
                    className={cn("size-8 text-sm", ativo && "bg-primary text-primary-foreground")}
                  />
                  {s.nombre}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col items-center gap-3 pt-1">
            <p className="text-sm text-muted-foreground">
              {supervisor ? `PIN de ${supervisor.nombre}` : "Escolha o supervisor"}
            </p>
            <div className="flex gap-3" role="status" aria-label={`${pin.length} de ${PIN_LEN} dígitos`}>
              {Array.from({ length: PIN_LEN }).map((_, i) => (
                <span
                  key={i}
                  className={cn("size-4 rounded-full border-2 border-primary", i < pin.length ? "bg-primary" : "bg-transparent")}
                />
              ))}
            </div>
          </div>
          <TecladoNumerico
            onDigito={(d) => onPin((p) => (p.length < PIN_LEN ? p + d : p))}
            onApagar={() => onPin((p) => p.slice(0, -1))}
            onLimpar={() => onPin(() => "")}
            disabled={!supervisorId || disabled}
          />
        </>
      )}
    </div>
  );
}
