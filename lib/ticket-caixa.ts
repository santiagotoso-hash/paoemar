import type { Ticket } from "@/lib/impressao";
import { dividirConta } from "@/lib/mesas";
import { formatDataHora } from "@/lib/format";

/** Um item da conta, já com o valor total da linha (adicionais incluídos). */
export type ItemConta = {
  cantidad: number | string;
  nome: string;
  /** Opção, adicionais e observação, uma por linha. */
  detalhes: string[];
  total: number;
};

export type DadosConta = {
  titulo: string;
  mesa: string;
  atendente?: string | null;
  emitidoEm: Date;
  pessoas?: number | null;
  itens: ItemConta[];
  consumo: number;
  /** Taxa de serviço; 0 quando não cobrada. */
  servico: number;
  /** Desconto (negativo) ou adicional (positivo). */
  ajuste: number;
  total: number;
  /** Só no recibo do fechamento. Ex.: "Cartão de crédito · Visa". */
  pagamento?: string;
  rodape: string;
  larguraMm: number;
  copias: number;
};

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** "R$ 12,00" com espaço comum (o espaço especial do Intl sai como caractere estranho na térmica). */
function brl(valor: number) {
  return reais.format(valor).replace(/ /g, " ");
}

function colunas(larguraMm: number) {
  return larguraMm === 58 ? 32 : 48;
}

/** Texto à esquerda e valor colado à direita na mesma linha. */
function linhaValor(esquerda: string, direita: string, cols: number) {
  const miolo = Math.max(1, cols - esquerda.length - direita.length);
  return esquerda + " ".repeat(miolo) + direita;
}

/**
 * Pré-conta e recibo do fechamento (impressora do Caixa). Não é documento fiscal.
 * Linhas já alinhadas na largura do papel.
 */
export function ticketDeConta(d: DadosConta): Ticket {
  const cols = colunas(d.larguraMm);
  const separador = "-".repeat(cols);
  const linhas: string[] = [d.mesa];
  if (d.atendente) linhas.push(`Atendente: ${d.atendente}`);
  linhas.push(formatDataHora(d.emitidoEm.toISOString()), separador);

  for (const item of d.itens) {
    const esquerda = `${String(item.cantidad).replace(".", ",")}x ${item.nome}`;
    const valor = brl(item.total);
    // Nome que não cabe com o valor na mesma linha: o nome vai sozinho (e é quebrado) e o valor desce.
    if (esquerda.length + valor.length + 1 <= cols) linhas.push(linhaValor(esquerda, valor, cols));
    else linhas.push(esquerda, linhaValor("", valor, cols));
    for (const detalhe of item.detalhes) linhas.push(`   ${detalhe}`);
  }

  linhas.push(separador, linhaValor("Consumo", brl(d.consumo), cols));
  if (d.servico > 0) linhas.push(linhaValor("Serviço (10%)", brl(d.servico), cols));
  if (d.ajuste < 0) linhas.push(linhaValor("Desconto", `- ${brl(-d.ajuste)}`, cols));
  if (d.ajuste > 0) linhas.push(linhaValor("Adicional", brl(d.ajuste), cols));
  linhas.push(separador, linhaValor("TOTAL", brl(d.total), cols));

  if (d.pessoas && d.pessoas > 1) {
    const { porPessoa, comCentavoExtra } = dividirConta(d.total, d.pessoas);
    linhas.push(linhaValor(`Por pessoa (${d.pessoas})`, brl(porPessoa), cols));
    if (comCentavoExtra > 0) linhas.push(`(+ R$ 0,01 para ${comCentavoExtra} pessoa(s))`);
  }
  if (d.pagamento) linhas.push(separador, `Pagamento: ${d.pagamento}`);
  linhas.push(separador, d.rodape);

  return { titulo: d.titulo, linhas, larguraMm: d.larguraMm, copias: d.copias };
}
