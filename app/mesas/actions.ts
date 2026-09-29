"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, ROUTE_ROLES } from "@/lib/auth";
import {
  encerrarSessaoAtendente,
  iniciarSessaoAtendente,
  requireAtendente,
  verificarPin,
} from "@/lib/atendente";
import { nomeMesa, TAXA_SERVICO, totalItem } from "@/lib/mesas";
import { publishVentaEvent } from "@/lib/realtime";
import { numeroRonda, rondaCocinaInclude, rondaParaEvento } from "@/lib/rondas";
import { crearVenta } from "@/lib/ventas";

type Resultado = { ok: true } | { ok: false; error: string };

const entrarSchema = z.object({
  atendenteId: z.string().min(1, "Escolha um atendente"),
  pin: z.string().regex(/^\d{4}$/, "O PIN tem 4 dígitos"),
});

/** Devolve ok/erro (em vez de lançar) para a tela poder limpar o PIN e avisar. */
export async function entrarAtendente(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireRole(ROUTE_ROLES["/mesas"]);
  const data = entrarSchema.parse(input);

  const atendente = await prisma.atendente.findUnique({ where: { id: data.atendenteId } });
  if (!atendente?.activo || !verificarPin(data.pin, atendente.pinHash)) {
    return { ok: false, error: "PIN incorreto" };
  }

  iniciarSessaoAtendente(atendente.id);
  return { ok: true };
}

const abrirMesaSchema = z.object({
  tipo: z.enum(["NUMERO", "NOMBRE"]),
  rotulo: z.string().trim().min(1, "Informe a mesa").max(40),
  personas: z.number().int().min(1).max(99).optional(),
});

type AbrirMesaResult =
  | { ok: true; id: string }
  | { ok: false; error: string; existente?: { id: string; codigo: string; tipo: "NUMERO" | "NOMBRE" } };

/** Nunca duplica: se já houver comanda aberta com o mesmo rótulo, devolve a existente. */
export async function abrirMesa(input: unknown): Promise<AbrirMesaResult> {
  await requireRole(ROUTE_ROLES["/mesas"]);
  const atendente = await requireAtendente();
  const data = abrirMesaSchema.parse(input);
  if (data.tipo === "NUMERO" && !/^\d{1,3}$/.test(data.rotulo)) {
    return { ok: false, error: "Número de mesa inválido" };
  }

  const res = await prisma.$transaction(
    async (tx) => {
      const existente = await tx.comanda.findFirst({
        where: { estado: "ABIERTA", codigo: { equals: data.rotulo, mode: "insensitive" } },
        select: { id: true, codigo: true, tipo: true },
      });
      if (existente) return { existente };

      const nova = await tx.comanda.create({
        data: {
          codigo: data.rotulo,
          tipo: data.tipo,
          personas: data.personas,
          atendenteId: atendente.id,
        },
      });
      return { id: nova.id };
    },
    { isolationLevel: "Serializable" }
  );

  if ("existente" in res && res.existente) {
    return { ok: false, error: "Essa mesa já está aberta", existente: res.existente };
  }
  revalidatePath("/mesas");
  return { ok: true, id: res.id! };
}

const lancarSchema = z
  .array(
    z.object({
      productoId: z.string().min(1),
      opcionIds: z.array(z.string()).max(10),
      adicionalIds: z.array(z.string()).max(30),
      observacao: z.string().trim().max(140).optional(),
      qtd: z.number().int().min(1).max(99),
    })
  )
  .min(1, "Nenhum item para lançar")
  .max(50);

/**
 * Transforma os itens pendentes do aparelho numa Ronda e manda para a cozinha.
 * Preços e opções são recalculados aqui a partir do banco (não confiamos no aparelho).
 */
export async function lancarRonda(comandaId: string, input: unknown): Promise<Resultado> {
  await requireRole(ROUTE_ROLES["/mesas"]);
  const atendente = await requireAtendente();
  const itens = lancarSchema.parse(input);

  const comanda = await prisma.comanda.findUnique({ where: { id: comandaId } });
  if (!comanda || comanda.estado !== "ABIERTA") return { ok: false, error: "Esta mesa não está aberta" };

  const productos = await prisma.producto.findMany({
    where: { id: { in: itens.map((i) => i.productoId) } },
    include: { adicionais: true, gruposOpcion: { include: { opciones: true } } },
  });

  const itemsData = [];
  for (const item of itens) {
    const p = productos.find((x) => x.id === item.productoId);
    if (!p || !p.activo) return { ok: false, error: "Um dos produtos não está mais disponível" };

    const escolhidas = [];
    for (const g of p.gruposOpcion) {
      const noGrupo = g.opciones.filter((o) => item.opcionIds.includes(o.id));
      if (noGrupo.length > 1 || (g.obligatorio && noGrupo.length === 0)) {
        return { ok: false, error: `Escolha ${g.nombre.toLocaleLowerCase("pt-BR")} de ${p.nombre}` };
      }
      escolhidas.push(...noGrupo);
    }
    if (escolhidas.length !== item.opcionIds.length) return { ok: false, error: `Opção inválida em ${p.nombre}` };

    const adicionais = p.adicionais.filter((a) => item.adicionalIds.includes(a.id));
    if (adicionais.length !== item.adicionalIds.length) {
      return { ok: false, error: `Adicional inválido em ${p.nombre}` };
    }

    itemsData.push({
      comandaId,
      productoId: p.id,
      cantidad: item.qtd,
      precioUnit: Number(p.precio) + escolhidas.reduce((acc, o) => acc + Number(o.precio), 0),
      opcion: escolhidas.length ? escolhidas.map((o) => o.nombre).join(" · ") : null,
      notas: item.observacao || null,
      adicionais: { create: adicionais.map((a) => ({ nombre: a.nombre, precio: a.precio })) },
    });
  }

  const ronda = await prisma.ronda.create({
    data: { comandaId, atendenteId: atendente.id, items: { create: itemsData } },
    include: rondaCocinaInclude,
  });

  await publishVentaEvent(rondaParaEvento(ronda, await numeroRonda(ronda)));

  revalidatePath("/mesas");
  revalidatePath(`/mesas/${comandaId}`);
  return { ok: true };
}

export async function alternarServico(comandaId: string, servicio: boolean) {
  await requireRole(ROUTE_ROLES["/mesas"]);
  await requireAtendente();
  await prisma.comanda.update({ where: { id: comandaId, estado: "ABIERTA" }, data: { servicio } });
  revalidatePath(`/mesas/${comandaId}`);
}

const fecharContaSchema = z.object({
  metodoPago: z.enum(["EFECTIVO", "TARJETA_CREDITO", "TARJETA_DEBITO", "TRANSFERENCIA"]),
});

/**
 * Fecha a mesa e gera a Venta. Usa o caixa aberto de quem está logado no aparelho;
 * se não houver, o caixa aberto mais recente da casa.
 * A venda não vai para a cozinha (os itens já foram pelas rodadas).
 */
export async function fecharConta(comandaId: string, input: unknown): Promise<Resultado> {
  const { userId } = await requireRole(ROUTE_ROLES["/mesas"]);
  await requireAtendente();
  const data = fecharContaSchema.parse(input);

  const comanda = await prisma.comanda.findUnique({
    where: { id: comandaId },
    include: { items: { include: { adicionais: true } } },
  });
  if (!comanda || comanda.estado !== "ABIERTA") return { ok: false, error: "Esta mesa não está aberta" };
  if (comanda.items.length === 0) return { ok: false, error: "Nenhum item lançado nesta mesa" };

  const caja =
    (await prisma.cajaSesion.findFirst({ where: { operadorId: userId, abierta: true } })) ??
    (await prisma.cajaSesion.findFirst({ where: { abierta: true }, orderBy: { abiertaEn: "desc" } }));
  if (!caja) return { ok: false, error: "Nenhum caixa aberto. Peça para abrir o caixa antes de fechar a conta." };

  const consumo = comanda.items.reduce((acc, i) => acc + totalItem(i), 0);
  const servicio = comanda.servicio ? Math.round(consumo * TAXA_SERVICO * 100) / 100 : 0;

  try {
    await crearVenta({
      items: comanda.items.map((i) => ({
        productoId: i.productoId,
        cantidad: Number(i.cantidad),
        precioUnit: Number(i.precioUnit),
        notas: [i.opcion, i.notas].filter(Boolean).join(" · ") || undefined,
        adicionais: i.adicionais.map((a) => ({ nombre: a.nombre, precio: Number(a.precio) })),
      })),
      origen: "COMANDA",
      operadorId: userId,
      metodoPago: data.metodoPago,
      nombreCliente: nomeMesa(comanda.tipo, comanda.codigo),
      comandaId: comanda.id,
      servicio,
      cajaSesionId: caja.id,
      enviarCocina: false,
      validarStock: false,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro ao fechar a conta" };
  }

  await prisma.comanda.update({
    where: { id: comanda.id },
    data: { estado: "CERRADA", cerradaEn: new Date() },
  });

  revalidatePath("/mesas");
  revalidatePath(`/mesas/${comandaId}`);
  return { ok: true };
}

export async function sairAtendente() {
  encerrarSessaoAtendente();
  redirect("/mesas/entrar");
}
