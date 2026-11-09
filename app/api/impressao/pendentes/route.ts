import { prisma } from "@/lib/prisma";
import { conferirAgente } from "@/lib/agente-auth";
import { DESTINOS } from "@/lib/impressoras";

export const dynamic = "force-dynamic";

/** Tickets mais velhos que isso não saem mais (evita imprimir tudo de uma vez ao religar o agente). */
const VALIDADE_MS = 30 * 60 * 1000;
/** Ticket entregue e sem confirmação volta para a fila depois deste prazo. */
const PRAZO_CONFIRMACAO_MS = 30 * 1000;
const MAX_TENTATIVAS = 5;

/**
 * O agente busca os tickets pendentes de um destino: GET /api/impressao/pendentes?destino=COZINHA.
 * Cada ticket entregue fica reservado ao agente até ele confirmar (ou o prazo passar).
 */
export async function GET(req: Request) {
  const negado = conferirAgente(req);
  if (negado) return negado;

  const destino = new URL(req.url).searchParams.get("destino");
  if (!destino || !(DESTINOS as readonly string[]).includes(destino)) {
    return new Response("destino inválido", { status: 400 });
  }
  const dest = destino as (typeof DESTINOS)[number];

  const impressora = await prisma.impressora.findUnique({ where: { destino: dest } });
  if (!impressora || !impressora.ativa) return Response.json({ impressora: null, tickets: [] });

  const agora = Date.now();
  const candidatos = await prisma.ticketImpressao.findMany({
    where: {
      destino: dest,
      impressoEm: null,
      tentativas: { lt: MAX_TENTATIVAS },
      criadoEm: { gte: new Date(agora - VALIDADE_MS) },
      OR: [{ reservadoEm: null }, { reservadoEm: { lt: new Date(agora - PRAZO_CONFIRMACAO_MS) } }],
    },
    orderBy: { criadoEm: "asc" },
    take: 20,
  });

  // Reserva um a um com a mesma condição: dois agentes nunca levam o mesmo ticket.
  const tickets = [];
  for (const t of candidatos) {
    const reservado = await prisma.ticketImpressao.updateMany({
      where: {
        id: t.id,
        impressoEm: null,
        OR: [{ reservadoEm: null }, { reservadoEm: { lt: new Date(agora - PRAZO_CONFIRMACAO_MS) } }],
      },
      data: { reservadoEm: new Date(), tentativas: { increment: 1 } },
    });
    if (reservado.count === 1) {
      tickets.push({ id: t.id, titulo: t.titulo, linhas: t.linhas, larguraMm: t.larguraMm, copias: t.copias });
    }
  }

  return Response.json({
    impressora: {
      conexao: impressora.conexao,
      endereco: impressora.endereco,
      porta: impressora.porta,
      larguraMm: impressora.larguraMm,
    },
    tickets,
  });
}
