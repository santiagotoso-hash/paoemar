"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, ROUTE_ROLES } from "@/lib/auth";
import { encomendaInclude, encomendaParaEvento, publicarEncomenda } from "@/lib/encomendas";
import { publishEncomendaEvent } from "@/lib/realtime";
import { enfileirarEncomenda } from "@/lib/fila-impressao";

const encomendaSchema = z.object({
  nombreCliente: z.string().trim().min(1, "Informe o nome do cliente"),
  /** Cliente escolhido da lista; sem ele, vale o nome digitado. */
  clienteId: z.string().optional(),
  telefone: z.string().trim().optional(),
  /** Data e hora combinadas, como vêm do campo da tela: "2026-11-10T08:30" (horário de Brasília). */
  retiradaEm: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Informe a data e a hora de retirada"),
  notas: z.string().trim().optional(),
  items: z
    .array(z.object({ productoId: z.string().min(1), cantidad: z.number().positive("Quantidade inválida") }))
    .min(1, "Adicione pelo menos um item"),
});

type Resultado = { ok: true; codigo: string } | { ok: false; error: string };

/** Próximo código sequencial: ENC-0001, ENC-0002… */
async function proximoCodigo() {
  const total = await prisma.encomenda.count();
  return `ENC-${String(total + 1).padStart(4, "0")}`;
}

export async function criarEncomenda(input: unknown): Promise<Resultado> {
  await requireRole(ROUTE_ROLES["/encomendas"]);

  const parsed = encomendaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const data = parsed.data;

  const retiradaEm = new Date(`${data.retiradaEm}:00-03:00`);
  if (Number.isNaN(retiradaEm.getTime())) return { ok: false, error: "Data de retirada inválida" };
  if (retiradaEm.getTime() < Date.now() - 5 * 60 * 1000) {
    return { ok: false, error: "A data de retirada já passou" };
  }

  // Só produtos ativos marcados como encomendáveis no Admin.
  const ids = Array.from(new Set(data.items.map((i) => i.productoId)));
  const validos = await prisma.producto.count({
    where: { id: { in: ids }, activo: true, encomendavel: true },
  });
  if (validos !== ids.length) return { ok: false, error: "Há itens que não podem ser encomendados" };

  // O nome fica gravado na encomenda mesmo com cliente vinculado (o cadastro pode mudar depois).
  let clienteId: string | null = null;
  if (data.clienteId) {
    const cliente = await prisma.cliente.findUnique({ where: { id: data.clienteId }, select: { id: true } });
    if (!cliente) return { ok: false, error: "Cliente não encontrado" };
    clienteId = cliente.id;
  }

  // O código vem de uma contagem: se duas encomendas saírem juntas, tenta de novo com o próximo.
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const codigo = await proximoCodigo();
    try {
      const criada = await prisma.encomenda.create({
        data: {
          codigo,
          nombreCliente: data.nombreCliente,
          clienteId,
          telefone: data.telefone || null,
          retiradaEm,
          notas: data.notas || null,
          items: { create: data.items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })) },
        },
      });
      const evento = await publicarEncomenda(criada.id);
      if (evento) await enfileirarEncomenda(evento);
      revalidatePath("/encomendas");
      revalidatePath("/fabrica");
      return { ok: true, codigo };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
      throw err;
    }
  }
  return { ok: false, error: "Não foi possível gerar o código da encomenda, tente de novo" };
}

/** Cancela uma encomenda que a Fábrica ainda não começou. */
export async function cancelarEncomenda(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireRole(ROUTE_ROLES["/encomendas"]);

  const e = await prisma.encomenda.findUnique({ where: { id }, include: encomendaInclude });
  if (!e) return { ok: true };
  if (e.estado !== "RECIBIDO") {
    return { ok: false, error: "A Fábrica já começou esta encomenda e ela não pode mais ser cancelada aqui" };
  }

  const apagadas = await prisma.encomenda.deleteMany({ where: { id, estado: "RECIBIDO" } });
  if (apagadas.count === 0) {
    return { ok: false, error: "A Fábrica já começou esta encomenda e ela não pode mais ser cancelada aqui" };
  }
  await publishEncomendaEvent({ ...encomendaParaEvento(e), removida: true });

  revalidatePath("/encomendas");
  revalidatePath("/fabrica");
  return { ok: true };
}
