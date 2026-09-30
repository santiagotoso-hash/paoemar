"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, ROUTE_ROLES } from "@/lib/auth";

export async function abrirCaja(input: unknown) {
  const { userId } = await requireRole(ROUTE_ROLES["/caja"]);
  const data = z.object({ fondoInicial: z.coerce.number().min(0) }).parse(input);

  const existing = await prisma.cajaSesion.findFirst({ where: { operadorId: userId, abierta: true } });
  if (existing) throw new Error("Você já tem um caixa aberto");

  await prisma.cajaSesion.create({ data: { operadorId: userId, fondoInicial: data.fondoInicial } });
  revalidatePath("/caja");
}

const movimientoSchema = z.object({
  tipo: z.enum(["SANGRIA", "SUMINISTRO"]),
  monto: z.coerce.number().positive("Tem que ser maior que 0"),
  descripcion: z.string().optional(),
});

export async function registrarMovimiento(input: unknown) {
  const { userId } = await requireRole(ROUTE_ROLES["/caja"]);
  const data = movimientoSchema.parse(input);

  const sesion = await prisma.cajaSesion.findFirst({ where: { operadorId: userId, abierta: true } });
  if (!sesion) throw new Error("Você não tem um caixa aberto");

  await prisma.cajaMovimiento.create({
    data: {
      cajaSesionId: sesion.id,
      tipo: data.tipo,
      monto: data.monto,
      descripcion: data.descripcion,
    },
  });
  revalidatePath("/caja");
}

export async function cerrarCaja() {
  const { userId } = await requireRole(ROUTE_ROLES["/caja"]);
  const sesion = await prisma.cajaSesion.findFirst({ where: { operadorId: userId, abierta: true } });
  if (!sesion) throw new Error("Você não tem um caixa aberto");

  await prisma.cajaSesion.update({
    where: { id: sesion.id },
    data: { abierta: false, cerradaEn: new Date() },
  });
  revalidatePath("/caja");
}
