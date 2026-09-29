import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nomeMesa } from "@/lib/mesas";
import type { VentaEvent } from "@/lib/realtime";

/** O que a cozinha precisa de uma rodada. */
export const rondaCocinaInclude = {
  comanda: { select: { codigo: true, tipo: true } },
  atendente: { select: { nombre: true } },
  items: {
    orderBy: { id: "asc" },
    select: {
      cantidad: true,
      notas: true,
      opcion: true,
      producto: { select: { nombre: true } },
      adicionais: { select: { nombre: true } },
    },
  },
} satisfies Prisma.RondaInclude;

type RondaCocina = Prisma.RondaGetPayload<{ include: typeof rondaCocinaInclude }>;

/** Opção, adicionais e observação juntos numa linha para a cozinha. */
export function notasCocina(i: { opcion: string | null; notas: string | null; adicionais: { nombre: string }[] }) {
  const partes = [
    i.opcion,
    ...i.adicionais.map((a) => `+ ${a.nombre}`),
    i.notas ? `obs: ${i.notas}` : null,
  ].filter(Boolean);
  return partes.length ? partes.join(" · ") : null;
}

/** Converte uma rodada no mesmo formato de evento que o quadro da cozinha já usa. */
export function rondaParaEvento(ronda: RondaCocina, numero: number): VentaEvent {
  return {
    id: ronda.id,
    codigo: `${nomeMesa(ronda.comanda.tipo, ronda.comanda.codigo)} · Rodada ${numero}`,
    nombreCliente: ronda.atendente.nombre,
    origen: "MESA",
    estado: ronda.estado,
    createdAt: ronda.creadaEn.toISOString(),
    items: ronda.items.map((i) => ({
      productoNombre: i.producto.nombre,
      cantidad: i.cantidad.toString(),
      notas: notasCocina(i),
    })),
  };
}

/** Número da rodada dentro da mesa (1, 2, 3…). */
export async function numeroRonda(ronda: { id: string; comandaId: string; creadaEn: Date }) {
  const anteriores = await prisma.ronda.count({
    where: { comandaId: ronda.comandaId, creadaEn: { lt: ronda.creadaEn } },
  });
  return anteriores + 1;
}

/** Igual a numeroRonda, pero para várias rodadas com uma consulta só (tela da cozinha). */
export async function numerosRondas(rondas: { id: string; comandaId: string }[]) {
  const todas = await prisma.ronda.findMany({
    where: { comandaId: { in: Array.from(new Set(rondas.map((r) => r.comandaId))) } },
    select: { id: true, comandaId: true },
    orderBy: { creadaEn: "asc" },
  });
  const porComanda = new Map<string, number>();
  const numeros = new Map<string, number>();
  for (const r of todas) {
    const n = (porComanda.get(r.comandaId) ?? 0) + 1;
    porComanda.set(r.comandaId, n);
    numeros.set(r.id, n);
  }
  return numeros;
}
