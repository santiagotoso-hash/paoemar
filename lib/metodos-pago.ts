/** Formas de pagamento (valor = enum MetodoPago do Prisma). */
export const METODOS_PAGO = [
  { value: "EFECTIVO", label: "Dinheiro" },
  { value: "TARJETA_CREDITO", label: "Cartão de crédito" },
  { value: "TARJETA_DEBITO", label: "Cartão de débito" },
  { value: "TRANSFERENCIA", label: "Transferência" },
] as const;

export type MetodoPagoValue = (typeof METODOS_PAGO)[number]["value"];
