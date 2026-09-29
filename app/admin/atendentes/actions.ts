"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { hashPin } from "@/lib/atendente";

const pinSchema = z.string().regex(/^\d{4}$/, "O PIN tem 4 dígitos");

export async function crearAtendente(input: unknown) {
  await requireRole(["admin"]);
  const data = z.object({ nombre: z.string().trim().min(1, "Obrigatório"), pin: pinSchema }).parse(input);
  await prisma.atendente.create({ data: { nombre: data.nombre, pinHash: hashPin(data.pin) } });
  revalidatePath("/admin/atendentes");
}

/** O PIN só muda se vier preenchido. */
export async function editarAtendente(id: string, input: unknown) {
  await requireRole(["admin"]);
  const data = z
    .object({ nombre: z.string().trim().min(1, "Obrigatório"), pin: pinSchema.or(z.literal("")) })
    .parse(input);
  await prisma.atendente.update({
    where: { id },
    data: { nombre: data.nombre, ...(data.pin ? { pinHash: hashPin(data.pin) } : {}) },
  });
  revalidatePath("/admin/atendentes");
}

/** Não apagamos atendentes: as rodadas lançadas continuam apontando para eles. */
export async function alternarAtendenteActivo(id: string, activo: boolean) {
  await requireRole(["admin"]);
  await prisma.atendente.update({ where: { id }, data: { activo } });
  revalidatePath("/admin/atendentes");
}
