"use server";

import type { EstadoVenta } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, ROUTE_ROLES } from "@/lib/auth";
import { publicarEncomenda } from "@/lib/encomendas";

const ORDEN_ESTADOS = ["RECIBIDO", "EN_PREPARACION", "LISTO", "ENTREGADO"] as const;

/** Campo da linha do tempo gravado ao entrar em cada estado. */
const CAMPO_TEMPO = {
  EN_PREPARACION: "emProducaoEm",
  LISTO: "prontoEm",
  ENTREGADO: "entregueEm",
} as const;

type Resultado = { ok: true } | { ok: false; error: string };

/**
 * Avança um estado. `desde` é o estado que a tela mostrava: se a encomenda já mudou
 * (toque duplo, outra tablet), não dá erro — só republica o estado atual para a tela sincronizar.
 */
export async function avanzarEstadoEncomenda(id: string, desde: EstadoVenta): Promise<Resultado> {
  await requireRole(ROUTE_ROLES["/fabrica"]);

  const idx = ORDEN_ESTADOS.indexOf(desde);
  const novo = idx === -1 || idx === ORDEN_ESTADOS.length - 1 ? null : ORDEN_ESTADOS[idx + 1];
  if (novo && novo !== "RECIBIDO") {
    const agora = new Date();
    await prisma.encomenda.updateMany({
      where: { id, estado: desde },
      data: { estado: novo, estadoDesde: agora, [CAMPO_TEMPO[novo]]: agora },
    });
  }
  await publicarEncomenda(id);

  revalidatePath("/fabrica");
  revalidatePath("/encomendas");
  return { ok: true };
}
