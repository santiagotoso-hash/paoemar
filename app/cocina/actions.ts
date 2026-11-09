"use server";

import type { EstadoVenta } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, ROUTE_ROLES } from "@/lib/auth";
import { publishVentaEvent } from "@/lib/realtime";
import { numeroRonda, rondaCocinaInclude, rondaParaEvento } from "@/lib/rondas";

const ORDEN_ESTADOS = ["RECIBIDO", "EN_PREPARACION", "LISTO", "ENTREGADO"] as const;

/** Campo da linha do tempo da rodada gravado ao entrar em cada estado. */
const CAMPO_TEMPO = {
  EN_PREPARACION: "emPreparoEm",
  LISTO: "prontoEm",
  ENTREGADO: "entregueEm",
} as const;

type Resultado = { ok: true } | { ok: false; error: string };

function proximoEstado(estado: EstadoVenta) {
  const idx = ORDEN_ESTADOS.indexOf(estado);
  return idx === -1 || idx === ORDEN_ESTADOS.length - 1 ? null : ORDEN_ESTADOS[idx + 1];
}

async function publicarVenta(ventaId: string) {
  const v = await prisma.venta.findUnique({
    where: { id: ventaId },
    include: { items: { include: { producto: true } } },
  });
  if (!v) return;
  await publishVentaEvent({
    id: v.id,
    codigo: v.codigo,
    nombreCliente: v.nombreCliente,
    origen: v.origen,
    estado: v.estado,
    createdAt: v.createdAt.toISOString(),
    tempos: {
      lancado: v.createdAt.toISOString(),
      entregue: v.estado === "ENTREGADO" ? v.updatedAt.toISOString() : null,
    },
    items: v.items.map((i) => ({
      productoNombre: i.producto.nombre,
      cantidad: i.cantidad.toString(),
      notas: i.notas,
      imprimirCozinha: i.producto.imprimirCozinha,
      imprimirProducao: i.producto.imprimirProducao,
    })),
  });
}

async function publicarRonda(rondaId: string) {
  const r = await prisma.ronda.findUnique({ where: { id: rondaId }, include: rondaCocinaInclude });
  if (r) await publishVentaEvent(rondaParaEvento(r, await numeroRonda(r)));
}

/**
 * Avança um estado. `desde` é o estado que a tela mostrava: se o pedido já mudou
 * (toque duplo, outra tablet), não dá erro — só republica o estado atual para a tela sincronizar.
 * A troca só acontece se o pedido ainda está em `desde` (dois toques nunca pulam duas etapas).
 */
export async function avanzarEstadoVenta(ventaId: string, desde: EstadoVenta): Promise<Resultado> {
  await requireRole(ROUTE_ROLES["/cocina"]);

  const novo = proximoEstado(desde);
  if (novo) {
    await prisma.venta.updateMany({ where: { id: ventaId, estado: desde }, data: { estado: novo } });
  }
  await publicarVenta(ventaId);

  revalidatePath("/cocina");
  return { ok: true };
}

/** Igual a avanzarEstadoVenta, mas para uma rodada lançada das mesas (grava a linha do tempo). */
export async function avanzarEstadoRonda(rondaId: string, desde: EstadoVenta): Promise<Resultado> {
  await requireRole(ROUTE_ROLES["/cocina"]);

  const ronda = await prisma.ronda.findUnique({ where: { id: rondaId }, select: { comandaId: true } });
  if (!ronda) return { ok: false, error: "Rodada não encontrada" };

  const novo = proximoEstado(desde) as keyof typeof CAMPO_TEMPO | null;
  if (novo) {
    const agora = new Date();
    await prisma.ronda.updateMany({
      where: { id: rondaId, estado: desde },
      data: { estado: novo, estadoDesde: agora, [CAMPO_TEMPO[novo]]: agora },
    });
  }
  await publicarRonda(rondaId);

  revalidatePath("/cocina");
  revalidatePath(`/mesas/${ronda.comandaId}`);
  return { ok: true };
}
