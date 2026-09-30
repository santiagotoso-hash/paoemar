"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, ROUTE_ROLES } from "@/lib/auth";
import { chaveTentativasPin, hashPin } from "@/lib/atendente";
import { getRedisPublisher } from "@/lib/redis";

const pinSchema = z.string().regex(/^\d{4}$/, "O PIN tem 4 dígitos");

export async function crearAtendente(input: unknown) {
  await requireRole(ROUTE_ROLES["/admin"]);
  const data = z
    .object({ nombre: z.string().trim().min(1, "Obrigatório"), pin: pinSchema, supervisor: z.boolean().default(false) })
    .parse(input);
  await prisma.atendente.create({
    data: { nombre: data.nombre, pinHash: hashPin(data.pin), supervisor: data.supervisor },
  });
  revalidatePath("/admin/atendentes");
}

/** O PIN só muda se vier preenchido. */
export async function editarAtendente(id: string, input: unknown) {
  await requireRole(ROUTE_ROLES["/admin"]);
  const data = z
    .object({
      nombre: z.string().trim().min(1, "Obrigatório"),
      pin: pinSchema.or(z.literal("")),
      supervisor: z.boolean().default(false),
    })
    .parse(input);
  await prisma.atendente.update({
    where: { id },
    data: { nombre: data.nombre, supervisor: data.supervisor, ...(data.pin ? { pinHash: hashPin(data.pin) } : {}) },
  });
  // PIN novo: as sessões abertas com o PIN antigo caem sozinhas; aqui liberamos o bloqueio de tentativas.
  if (data.pin) await getRedisPublisher().del(chaveTentativasPin(id));
  revalidatePath("/admin/atendentes");
}

/** Não apagamos atendentes: as rodadas lançadas continuam apontando para eles. */
export async function alternarAtendenteActivo(id: string, activo: boolean) {
  await requireRole(ROUTE_ROLES["/admin"]);
  await prisma.atendente.update({ where: { id }, data: { activo } });
  revalidatePath("/admin/atendentes");
}
