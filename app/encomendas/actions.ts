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

type Validada =
  | { ok: true; data: z.infer<typeof encomendaSchema>; retiradaEm: Date; clienteId: string | null }
  | { ok: false; error: string };

/** Confere os dados do formulário (criação e edição usam as mesmas regras). */
async function validarEncomenda(input: unknown): Promise<Validada> {
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
  return { ok: true, data, retiradaEm, clienteId };
}

export async function criarEncomenda(input: unknown): Promise<Resultado> {
  await requireRole(ROUTE_ROLES["/encomendas"]);

  const v = await validarEncomenda(input);
  if (!v.ok) return v;
  const { data, retiradaEm, clienteId } = v;

  // O código vem de uma contagem: se duas encomendas saírem juntas, tenta de novo com o próximo.
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const codigo = await proximoCodigo();
    try {
      await prisma.encomenda.create({
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
      // Nasce como rascunho: a Fábrica só recebe (e o ticket só sai) quando a encomenda é confirmada.
      revalidatePath("/encomendas");
      return { ok: true, codigo };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
      throw err;
    }
  }
  return { ok: false, error: "Não foi possível gerar o código da encomenda, tente de novo" };
}

/** Edita uma encomenda que ainda é rascunho (depois de confirmada, a Fábrica já a recebeu). */
export async function editarEncomenda(id: string, input: unknown): Promise<Resultado> {
  await requireRole(ROUTE_ROLES["/encomendas"]);

  const atual = await prisma.encomenda.findUnique({ where: { id }, select: { codigo: true, confirmadaEm: true } });
  if (!atual) return { ok: false, error: "Encomenda não encontrada" };
  if (atual.confirmadaEm) return { ok: false, error: "Esta encomenda já foi confirmada e não pode mais ser editada" };

  const v = await validarEncomenda(input);
  if (!v.ok) return v;
  const { data, retiradaEm, clienteId } = v;

  // Troca os itens por inteiro. A condição `confirmadaEm: null` impede editar se alguém confirmou nesse meio-tempo.
  const feito = await prisma.$transaction(async (tx) => {
    const alterada = await tx.encomenda.updateMany({
      where: { id, confirmadaEm: null },
      data: {
        nombreCliente: data.nombreCliente,
        clienteId,
        telefone: data.telefone || null,
        retiradaEm,
        notas: data.notas || null,
      },
    });
    if (alterada.count === 0) return false;
    await tx.encomendaItem.deleteMany({ where: { encomendaId: id } });
    await tx.encomendaItem.createMany({
      data: data.items.map((i) => ({ encomendaId: id, productoId: i.productoId, cantidad: i.cantidad })),
    });
    return true;
  });
  if (!feito) return { ok: false, error: "Esta encomenda já foi confirmada e não pode mais ser editada" };

  revalidatePath("/encomendas");
  return { ok: true, codigo: atual.codigo };
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
  // Rascunho nunca chegou à Fábrica: não há cartão para tirar de lá.
  if (e.confirmadaEm) await publishEncomendaEvent({ ...encomendaParaEvento(e), removida: true });

  revalidatePath("/encomendas");
  revalidatePath("/fabrica");
  return { ok: true };
}

/**
 * Confirma o rascunho: a encomenda passa a existir para a Fábrica (aparece na tela dela, em tempo real)
 * e o ticket sai na impressora da produção. Depois disso não pode mais ser editada, só cancelada
 * enquanto a Fábrica não começar.
 */
export async function confirmarEncomenda(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireRole(ROUTE_ROLES["/encomendas"]);

  // A condição garante que dois toques (ou duas telas) confirmem uma única vez, sem ticket em duplicidade.
  const confirmada = await prisma.encomenda.updateMany({
    where: { id, confirmadaEm: null, estado: "RECIBIDO" },
    data: { confirmadaEm: new Date() },
  });
  if (confirmada.count === 0) {
    const existe = await prisma.encomenda.findUnique({ where: { id }, select: { confirmadaEm: true } });
    if (!existe) return { ok: false, error: "Encomenda não encontrada" };
    return { ok: true }; // já estava confirmada
  }

  // A encomenda já está confirmada: falha ao avisar a Fábrica ou ao imprimir não pode desfazer isso.
  try {
    const evento = await publicarEncomenda(id);
    if (evento) await enfileirarEncomenda(evento);
  } catch (err) {
    console.error("confirmarEncomenda: falha ao publicar", err);
  }

  revalidatePath("/encomendas");
  revalidatePath("/fabrica");
  return { ok: true };
}
