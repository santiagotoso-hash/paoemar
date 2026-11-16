/** Dados fiscais de um item (Simples Nacional): NCM, CFOP, CSOSN e origem. */
export type DadosFiscais = {
  ncm: string | null;
  cfop: string | null;
  csosn: string | null;
  origem: number | null;
};

export const FORMATO = {
  ncm: /^\d{8}$/,
  cfop: /^\d{4}$/,
  csosn: /^\d{3}$/,
} as const;

/** Tabela de origem da mercadoria (NF-e). */
export const TEXTO_ORIGEM: Record<number, string> = {
  0: "0 · Nacional",
  1: "1 · Estrangeira, importação direta",
  2: "2 · Estrangeira, adquirida no mercado interno",
  3: "3 · Nacional, importação entre 40% e 70%",
  4: "4 · Nacional, processos produtivos básicos",
  5: "5 · Nacional, importação até 40%",
  6: "6 · Estrangeira, importação direta, sem similar",
  7: "7 · Estrangeira, mercado interno, sem similar",
  8: "8 · Nacional, importação acima de 70%",
};

export const ORIGENS = Object.keys(TEXTO_ORIGEM).map(Number);

/** "1905.90.90" -> "19059090" (só dígitos). */
export function soDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

/** NCM formatado para leitura: "19059090" -> "1905.90.90". */
export function formatarNcm(ncm: string) {
  return FORMATO.ncm.test(ncm) ? `${ncm.slice(0, 4)}.${ncm.slice(4, 6)}.${ncm.slice(6)}` : ncm;
}

/** Vale o dado do produto; se ele não tiver, o da categoria. */
export function dadosEfetivos(produto: DadosFiscais, categoria: DadosFiscais): DadosFiscais {
  return {
    ncm: produto.ncm ?? categoria.ncm,
    cfop: produto.cfop ?? categoria.cfop,
    csosn: produto.csosn ?? categoria.csosn,
    origem: produto.origem ?? categoria.origem,
  };
}

/** O que ainda falta para o item poder entrar numa nota (vazio = completo). */
export function faltaFiscal(d: DadosFiscais): string[] {
  const falta: string[] = [];
  if (!d.ncm) falta.push("NCM");
  if (!d.cfop) falta.push("CFOP");
  if (!d.csosn) falta.push("CSOSN");
  if (d.origem === null) falta.push("origem");
  return falta;
}

/** Confere os dígitos verificadores do CNPJ (aceita com ou sem pontuação). */
export function cnpjValido(valor: string) {
  const c = soDigitos(valor);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const digito = (base: string, pesos: number[]) => {
    const soma = base.split("").reduce((acc, n, i) => acc + Number(n) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = digito(c.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digito(c.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(c[12]) && d2 === Number(c[13]);
}
