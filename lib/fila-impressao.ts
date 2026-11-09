import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DESTINOS, type Destino } from "@/lib/impressoras";
import { lerConfigImpressora } from "@/lib/impressoras-db";
import type { Ticket } from "@/lib/impressao";
import type { EncomendaEvent, VentaEvent } from "@/lib/realtime";
import { ticketDeEncomenda, ticketDePedido } from "@/lib/ticket";

/** Guarda o ticket na fila. A chave impede duplicar: reenvio do mesmo pedido não imprime de novo. */
async function enfileirar(destino: Destino, ticket: Ticket, chave: string) {
  try {
    await prisma.ticketImpressao.create({
      data: {
        chave: `${chave}:${destino}`,
        destino,
        titulo: ticket.titulo,
        linhas: ticket.linhas,
        larguraMm: ticket.larguraMm,
        copias: ticket.copias,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return;
    throw err;
  }
}

/**
 * Pedido de mesa/balcão: um ticket para cada impressora (cozinha e produção) que tenha
 * itens marcados no pedido. Falha ao enfileirar não derruba o pedido: só vai para o log.
 */
export async function enfileirarPedido(evento: VentaEvent, chave: string) {
  try {
    for (const destino of DESTINOS) {
      const config = await lerConfigImpressora(destino);
      if (!config.ativa) continue;
      const ticket = ticketDePedido(evento, destino, config);
      if (ticket) await enfileirar(destino, ticket, chave);
    }
  } catch (err) {
    console.error("Falha ao enfileirar ticket do pedido", chave, err);
  }
}

/** Encomenda nova: ticket completo na impressora da produção. */
export async function enfileirarEncomenda(evento: EncomendaEvent) {
  try {
    const config = await lerConfigImpressora("PRODUCAO");
    if (!config.ativa) return;
    await enfileirar("PRODUCAO", ticketDeEncomenda(evento, config), `encomenda:${evento.id}`);
  } catch (err) {
    console.error("Falha ao enfileirar ticket da encomenda", evento.id, err);
  }
}
