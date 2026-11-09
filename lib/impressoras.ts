export const DESTINOS = ["COZINHA", "PRODUCAO", "CAIXA"] as const;
export type Destino = (typeof DESTINOS)[number];

/** Destinos que recebem itens de pedido (marcações do produto). O caixa imprime contas, não itens. */
export const DESTINOS_DE_PRODUTO = ["COZINHA", "PRODUCAO"] as const;
export type DestinoDeProduto = (typeof DESTINOS_DE_PRODUTO)[number];

export const CONEXOES = ["REDE", "USB", "BLUETOOTH"] as const;
export type Conexao = (typeof CONEXOES)[number];

export const TEXTO_DESTINO: Record<Destino, string> = {
  COZINHA: "Cozinha",
  PRODUCAO: "Produção",
  CAIXA: "Caixa",
};

export const TEXTO_CONEXAO: Record<Conexao, string> = {
  REDE: "Rede (IP)",
  USB: "USB",
  BLUETOOTH: "Bluetooth",
};

export type ConfigImpressora = {
  destino: Destino;
  nome: string;
  ativa: boolean;
  conexao: Conexao;
  endereco: string;
  porta: string;
  larguraMm: 58 | 80;
  copias: number;
};

/** Valores iniciais enquanto a impressora ainda não foi configurada. */
export function configPadrao(destino: Destino): ConfigImpressora {
  return {
    destino,
    nome: `Impressora ${TEXTO_DESTINO[destino]}`,
    ativa: false,
    conexao: "REDE",
    endereco: "",
    porta: "9100",
    larguraMm: 80,
    copias: 1,
  };
}
