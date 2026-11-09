import { prisma } from "@/lib/prisma";
import { conferirAgente } from "@/lib/agente-auth";

export const dynamic = "force-dynamic";

/**
 * O agente confirma o ticket: POST { ok: true } quando imprimiu, ou { ok: false, erro } se falhou
 * (nesse caso ele volta para a fila e é tentado de novo, até o limite).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const negado = conferirAgente(req);
  if (negado) return negado;

  const corpo = (await req.json().catch(() => null)) as { ok?: boolean; erro?: string } | null;
  if (!corpo || typeof corpo.ok !== "boolean") return new Response("corpo inválido", { status: 400 });

  await prisma.ticketImpressao.updateMany({
    where: { id: params.id },
    data: corpo.ok
      ? { impressoEm: new Date(), erro: null }
      : { reservadoEm: null, erro: (corpo.erro ?? "erro ao imprimir").slice(0, 300) },
  });
  return Response.json({ ok: true });
}
