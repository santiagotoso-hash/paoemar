import { z } from "zod";

/** Formas de pagamento (valor = enum MetodoPago do Prisma). */
export const METODOS_PAGO = [
  { value: "EFECTIVO", label: "Dinheiro" },
  { value: "TARJETA_CREDITO", label: "Cartão de crédito" },
  { value: "TARJETA_DEBITO", label: "Cartão de débito" },
  { value: "PIX", label: "Pix" },
] as const;

export type MetodoPagoValue = (typeof METODOS_PAGO)[number]["value"];

/** Bandeiras de cartão (valor = enum BandeiraCartao do Prisma). */
export const BANDEIRAS = [
  { value: "VISA", label: "Visa" },
  { value: "MASTERCARD", label: "Mastercard" },
  { value: "ELO", label: "Elo" },
  { value: "AMEX", label: "American Express" },
  { value: "HIPERCARD", label: "Hipercard" },
  { value: "OUTRA", label: "Outra" },
] as const;

export type BandeiraValue = (typeof BANDEIRAS)[number]["value"];

/** Aceita também métodos legados (string), que nunca exigem bandeira. */
export function exigeBandeira(metodo: MetodoPagoValue | string) {
  return metodo === "TARJETA_CREDITO" || metodo === "TARJETA_DEBITO";
}

export const METODO_PAGO_LABEL: Record<string, string> = {
  ...Object.fromEntries(METODOS_PAGO.map((m) => [m.value, m.label])),
  // Legado: não é mais oferecido, mas pode existir em vendas antigas.
  TRANSFERENCIA: "Transferência",
};
export const BANDEIRA_LABEL: Record<string, string> = Object.fromEntries(BANDEIRAS.map((b) => [b.value, b.label]));

/** Campos de pagamento para os schemas das actions (use com `.superRefine(validarPagamento)`). */
export const camposPagamento = {
  metodoPago: z.enum(["EFECTIVO", "TARJETA_CREDITO", "TARJETA_DEBITO", "PIX"]),
  bandeira: z.enum(["VISA", "MASTERCARD", "ELO", "AMEX", "HIPERCARD", "OUTRA"]).nullish(),
};

export function validarPagamento(
  data: { metodoPago: MetodoPagoValue; bandeira?: BandeiraValue | null },
  ctx: z.RefinementCtx
) {
  if (exigeBandeira(data.metodoPago) && !data.bandeira) {
    ctx.addIssue({ code: "custom", path: ["bandeira"], message: "Escolha a bandeira do cartão" });
  }
}

/** Bandeira só fica gravada em pagamento com cartão. */
export function bandeiraParaGravar(metodo: MetodoPagoValue | string, bandeira?: BandeiraValue | null) {
  return exigeBandeira(metodo) ? (bandeira ?? null) : null;
}
