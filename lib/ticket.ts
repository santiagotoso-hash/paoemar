import type { EncomendaEvent, VentaEvent } from "@/lib/realtime";
import { formatDataHora, formatHora } from "@/lib/format";
import { TEXTO_DESTINO, type ConfigImpressora, type DestinoDeProduto } from "@/lib/impressoras";
import type { Ticket } from "@/lib/impressao";

function separador(larguraMm: number) {
  return "-".repeat(larguraMm === 58 ? 28 : 40);
}

/** "2x Pão de queijo" e, na linha de baixo, a observação. */
function linhasDeItem(i: { productoNombre: string; cantidad: string; notas: string | null }) {
  return [`${i.cantidad}x ${i.productoNombre}`, ...(i.notas ? [`   ${i.notas}`] : [])];
}

/**
 * Ticket de um pedido de mesa/balcão para a impressora do destino: só os itens marcados
 * no produto (cozinha ou produção). Sem itens marcados, não há o que imprimir (null).
 */
export function ticketDePedido(v: VentaEvent, destino: DestinoDeProduto, config: ConfigImpressora): Ticket | null {
  const itens = v.items.filter((i) => (destino === "COZINHA" ? i.imprimirCozinha : i.imprimirProducao));
  if (itens.length === 0) return null;

  return {
    titulo: `${TEXTO_DESTINO[destino].toUpperCase()} · ${v.codigo}`,
    larguraMm: config.larguraMm,
    copias: config.copias,
    linhas: [
      `${v.nombreCliente} · ${formatHora(v.createdAt)}`,
      separador(config.larguraMm),
      ...itens.flatMap(linhasDeItem),
    ],
  };
}

/** Ticket de uma encomenda para a produção: todos os itens, com cliente e horário de retirada. */
export function ticketDeEncomenda(e: EncomendaEvent, config: ConfigImpressora): Ticket {
  return {
    titulo: `ENCOMENDA ${e.codigo}`,
    larguraMm: config.larguraMm,
    copias: config.copias,
    linhas: [
      `Cliente: ${e.nombreCliente}`,
      ...(e.telefone ? [`Tel: ${e.telefone}`] : []),
      `RETIRADA: ${formatDataHora(e.retiradaEm)}`,
      separador(config.larguraMm),
      ...e.items.flatMap(linhasDeItem),
      ...(e.notas ? [separador(config.larguraMm), `Obs: ${e.notas}`] : []),
    ],
  };
}
