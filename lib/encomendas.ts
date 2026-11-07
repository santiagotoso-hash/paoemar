import type { Prisma } from "@prisma/client";
import { publishEncomendaEvent, type EncomendaEvent } from "@/lib/realtime";
import { prisma } from "@/lib/prisma";

export const encomendaInclude = {
  items: { include: { producto: true }, orderBy: { id: "asc" } },
} satisfies Prisma.EncomendaInclude;

type EncomendaComItens = Prisma.EncomendaGetPayload<{ include: typeof encomendaInclude }>;

export function encomendaParaEvento(e: EncomendaComItens): EncomendaEvent {
  return {
    id: e.id,
    codigo: e.codigo,
    nombreCliente: e.nombreCliente,
    telefone: e.telefone,
    retiradaEm: e.retiradaEm.toISOString(),
    notas: e.notas,
    estado: e.estado,
    createdAt: e.creadaEn.toISOString(),
    estadoDesde: e.estadoDesde.toISOString(),
    tempos: {
      lancado: e.creadaEn.toISOString(),
      emPreparo: e.emProducaoEm?.toISOString() ?? null,
      pronto: e.prontoEm?.toISOString() ?? null,
      entregue: e.entregueEm?.toISOString() ?? null,
    },
    items: e.items.map((i) => ({
      productoNombre: i.producto.nombre,
      cantidad: i.cantidad.toString(),
      notas: i.notas,
    })),
  };
}

/** Relê a encomenda e avisa a Fábrica (e a tela de encomendas) pelo tempo real. */
export async function publicarEncomenda(id: string) {
  const e = await prisma.encomenda.findUnique({ where: { id }, include: encomendaInclude });
  if (e) await publishEncomendaEvent(encomendaParaEvento(e));
}
