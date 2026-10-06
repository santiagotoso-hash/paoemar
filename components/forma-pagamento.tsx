"use client";

import { Banknote, CreditCard, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BANDEIRAS,
  exigeBandeira,
  METODOS_PAGO,
  type BandeiraValue,
  type MetodoPagoValue,
} from "@/lib/metodos-pago";

const ICONE: Record<MetodoPagoValue, typeof Banknote> = {
  EFECTIVO: Banknote,
  TARJETA_CREDITO: CreditCard,
  TARJETA_DEBITO: CreditCard,
  PIX: QrCode,
};

/** Rótulo curto no botão (o completo fica no aria-label). */
const CURTO: Record<MetodoPagoValue, string> = {
  EFECTIVO: "Dinheiro",
  TARJETA_CREDITO: "Crédito",
  TARJETA_DEBITO: "Débito",
  PIX: "Pix",
};

/**
 * Escolha da forma de pagamento; em crédito/débito pede também a bandeira.
 * Usado no balcão, no fechamento de mesa e nas comandas.
 */
export function FormaPagamento({
  metodo,
  onMetodo,
  bandeira,
  onBandeira,
}: {
  metodo: MetodoPagoValue;
  onMetodo: (m: MetodoPagoValue) => void;
  bandeira: BandeiraValue | null;
  onBandeira: (b: BandeiraValue | null) => void;
}) {
  const cartao = exigeBandeira(metodo);

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Forma de pagamento" className="grid grid-cols-2 gap-2">
        {METODOS_PAGO.map((m) => {
          const ativo = m.value === metodo;
          const Icone = ICONE[m.value];
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={ativo}
              aria-label={m.label}
              onClick={() => {
                onMetodo(m.value);
                // Trocar de cartão para outra forma limpa a bandeira.
                if (!exigeBandeira(m.value)) onBandeira(null);
              }}
              className={cn(
                "flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors",
                ativo ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
              )}
            >
              <Icone className="size-4" aria-hidden />
              {CURTO[m.value]}
            </button>
          );
        })}
      </div>

      {cartao && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            Bandeira do cartão <span className="text-xs font-normal text-muted-foreground">(obrigatória)</span>
          </p>
          <div role="radiogroup" aria-label="Bandeira do cartão" className="grid grid-cols-3 gap-2">
            {BANDEIRAS.map((b) => {
              const ativo = b.value === bandeira;
              return (
                <button
                  key={b.value}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => onBandeira(b.value)}
                  className={cn(
                    "min-h-11 rounded-xl border px-2 text-xs font-medium transition-colors sm:text-sm",
                    ativo ? "border-primary bg-accent ring-1 ring-primary" : "bg-card hover:bg-muted"
                  )}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Pode confirmar o pagamento? (cartão exige bandeira) */
export function pagamentoCompleto(metodo: MetodoPagoValue, bandeira: BandeiraValue | null) {
  return !exigeBandeira(metodo) || !!bandeira;
}
