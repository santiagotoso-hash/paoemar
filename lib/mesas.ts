import type { TipoMesa } from "@prisma/client";

/**
 * Mesas fixas da casa: aparecem como "Livre" quando não há comanda aberta.
 * Mesas abertas fora desta lista também aparecem na grade (enquanto abertas).
 */
export const MESAS_DA_CASA: { tipo: TipoMesa; rotulo: string }[] = [
  ...Array.from({ length: 12 }, (_, i) => ({ tipo: "NUMERO" as const, rotulo: String(i + 1) })),
  { tipo: "NOMBRE", rotulo: "Varanda" },
  { tipo: "NOMBRE", rotulo: "Balcão 1" },
  { tipo: "NOMBRE", rotulo: "Balcão 2" },
];

/** Taxa de serviço aplicada quando a comanda tem `servicio = true`. */
export const TAXA_SERVICO = 0.1;

/** Chave para comparar rótulos sem duplicar mesa ("varanda" == "Varanda "). */
export function chaveMesa(rotulo: string) {
  return rotulo.trim().toLocaleLowerCase("pt-BR");
}

export function nomeMesa(tipo: TipoMesa, rotulo: string) {
  return tipo === "NUMERO" ? `Mesa ${rotulo}` : rotulo;
}

/**
 * Divide a conta em centavos: R$ 100 ÷ 3 = R$ 33,33 para todos e 1 pessoa paga R$ 33,34,
 * para a soma bater exatamente com o total.
 */
export function dividirConta(total: number, pessoas: number) {
  const n = Math.max(1, Math.floor(pessoas));
  const centavos = Math.round(total * 100);
  const base = Math.floor(centavos / n);
  return {
    porPessoa: base / 100,
    /** Quantas pessoas pagam 1 centavo a mais. */
    comCentavoExtra: centavos - base * n,
  };
}

type ItemComPreco = {
  cantidad: number | string | { toString(): string };
  precioUnit: number | string | { toString(): string };
  adicionais?: { precio: number | string | { toString(): string } }[];
};

/** (preço unitário + adicionais) × quantidade */
export function totalItem(item: ItemComPreco) {
  const adicionais = (item.adicionais ?? []).reduce((acc, a) => acc + Number(a.precio.toString()), 0);
  return (Number(item.precioUnit.toString()) + adicionais) * Number(item.cantidad.toString());
}
