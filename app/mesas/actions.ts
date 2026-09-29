"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, ROUTE_ROLES } from "@/lib/auth";
import {
  chaveTentativasPin,
  encerrarSessaoAtendente,
  iniciarSessaoAtendente,
  requireAtendente,
  verificarPin,
} from "@/lib/atendente";
import { redondear2 } from "@/lib/format";
import { nomeMesa, TAXA_SERVICO, totalItem } from "@/lib/mesas";
import { publishVentaEvent } from "@/lib/realtime";
import { getRedisPublisher } from "@/lib/redis";
import { numeroRonda, rondaCocinaInclude, rondaParaEvento } from "@/lib/rondas";
import { bloquearComandaAbierta, crearVentaTx, publicarVenta } from "@/lib/ventas";

type Resultado = { ok: true } | { ok: false; error: string };

const entrarSchema = z.object({
  atendenteId: z.string().min(1, "Escolha um atendente"),
  pin: z.string().regex(/^\d{4}$/, "O PIN tem 4 dígitos"),
});

/** Tentativas de PIN por atendente dentro da janela; depois disso fica bloqueado. */
const MAX_TENTATIVAS_PIN = 5;
const JANELA_PIN_SEG = 15 * 60;

/** Devolve ok/erro (em vez de lançar) para a tela poder limpar o PIN e avisar. */
export async function entrarAtendente(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await requireRole(ROUTE_ROLES["/mesas"]);
  const data = entrarSchema.parse(input);

  // Conta a tentativa antes de conferir o PIN (INCR é atômico: tentativas em paralelo também contam).
  const redis = getRedisPublisher();
  const chave = chaveTentativasPin(data.atendenteId);
  const tentativas = await redis.incr(chave);
  if (tentativas === 1) await redis.expire(chave, JANELA_PIN_SEG);
  if (tentativas > MAX_TENTATIVAS_PIN) {
    return { ok: false, error: "Muitas tentativas. Espere 15 minutos ou peça a um admin para trocar o PIN." };
  }

  const atendente = await prisma.atendente.findUnique({ where: { id: data.atendenteId } });
  if (!atendente?.activo || !verificarPin(data.pin, atendente.pinHash)) {
    return { ok: false, error: "PIN incorreto" };
  }

  await redis.del(chave);
  iniciarSessaoAtendente(atendente, userId);
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

  const abrir = () =>
    prisma.$transaction(
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
            servicio: true,
            atendenteId: atendente.id,
          },
        });
        return { id: nova.id };
      },
      { isolationLevel: "Serializable" }
    );

  // Dois aparelhos abrindo a mesma mesa ao mesmo tempo: um perde a serialização (P2034).
  // Na nova tentativa ele já enxerga a mesa aberta pelo outro.
  let res: Awaited<ReturnType<typeof abrir>> | undefined;
  for (let tentativa = 1; !res; tentativa++) {
    try {
      res = await abrir();
    } catch (err) {
      const conflito = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
      if (!conflito || tentativa >= 3) throw err;
    }
  }

  if ("existente" in res && res.existente) {
    return { ok: false, error: "Essa mesa já está aberta", existente: res.existente };
  }
  revalidatePath("/mesas");
  return { ok: true, id: res.id! };
}

const lancarSchema = z.object({
  /** Gerada no aparelho por envio: se a resposta se perder e ele reenviar, não duplica a rodada. */
  clave: z.string().min(8).max(64),
  itens: z
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
    .max(50),
});

async function publicarRonda(rondaId: string) {
  const ronda = await prisma.ronda.findUniqueOrThrow({ where: { id: rondaId }, include: rondaCocinaInclude });
  await publishVentaEvent(rondaParaEvento(ronda, await numeroRonda(ronda)));
}

/**
 * Transforma os itens pendentes do aparelho numa Ronda e manda para a cozinha.
 * Preços e opções são recalculados aqui a partir do banco (não confiamos no aparelho).
 */
export async function lancarRonda(comandaId: string, input: unknown): Promise<Resultado> {
  await requireRole(ROUTE_ROLES["/mesas"]);
  const atendente = await requireAtendente();
  const { clave, itens } = lancarSchema.parse(input);

  const comanda = await prisma.comanda.findUnique({ where: { id: comandaId } });
  if (!comanda || comanda.estado !== "ABIERTA") return { ok: false, error: "Esta mesa não está aberta" };

  const productos = await prisma.producto.findMany({
    where: { id: { in: itens.map((i) => i.productoId) } },
    include: { adicionais: true, gruposOpcion: { include: { opciones: true } } },
  });

  const itemsData: Prisma.ComandaItemUncheckedCreateWithoutRondaInput[] = [];
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
      precioUnit: redondear2(Number(p.precio) + escolhidas.reduce((acc, o) => acc + Number(o.precio), 0)),
      opcion: escolhidas.length ? escolhidas.map((o) => o.nombre).join(" · ") : null,
      notas: item.observacao || null,
      adicionais: { create: adicionais.map((a) => ({ nombre: a.nombre, precio: a.precio })) },
    });
  }

  // A trava na comanda serializa com fecharConta: ou a rodada entra antes do fechamento
  // (e é cobrada), ou encontra a mesa fechada e não vai para a cozinha.
  let res: { rondaId: string } | { repetida: string } | { fechada: true };
  try {
    res = await prisma.$transaction(async (tx) => {
      const repetida = await tx.ronda.findUnique({ where: { clave }, select: { id: true } });
      if (repetida) return { repetida: repetida.id };
      if (!(await bloquearComandaAbierta(tx, comandaId))) return { fechada: true as const };
      const ronda = await tx.ronda.create({
        data: { comandaId, atendenteId: atendente.id, clave, items: { create: itemsData } },
        select: { id: true },
      });
      return { rondaId: ronda.id };
    });
  } catch (err) {
    // Mesmo envio chegando duas vezes ao mesmo tempo: o segundo bate na unique de `clave`.
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    const repetida = await prisma.ronda.findUniqueOrThrow({ where: { clave }, select: { id: true } });
    res = { repetida: repetida.id };
  }

  if ("fechada" in res) return { ok: false, error: "Esta mesa não está aberta" };

  // Num reenvio publica de novo: se a primeira publicação falhou, a cozinha recebe agora
  // (o quadro da cozinha substitui pelo id, não duplica).
  await publicarRonda("rondaId" in res ? res.rondaId : res.repetida);

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
  /** O total que o aparelho mostrou ao cliente; se a conta mudou nesse meio tempo, não fecha. */
  totalEsperado: z.number().nonnegative(),
});

/**
 * Fecha a mesa e gera a Venta. Usa o caixa aberto de quem está logado no aparelho;
 * se não houver, o caixa aberto mais recente da casa.
 * A venda não vai para a cozinha (os itens já foram pelas rodadas); os itens lançados
 * pela tela antiga de comandas (sem rodada) viram uma rodada agora e vão para a cozinha.
 * Venda e fechamento acontecem na mesma transação, com a comanda travada.
 */
export async function fecharConta(comandaId: string, input: unknown): Promise<Resultado> {
  const { userId } = await requireRole(ROUTE_ROLES["/mesas"]);
  const atendente = await requireAtendente();
  const data = fecharContaSchema.parse(input);

  const caja =
    (await prisma.cajaSesion.findFirst({ where: { operadorId: userId, abierta: true } })) ??
    (await prisma.cajaSesion.findFirst({ where: { abierta: true }, orderBy: { abiertaEn: "desc" } }));
  if (!caja) return { ok: false, error: "Nenhum caixa aberto. Peça para abrir o caixa antes de fechar a conta." };

  type Cierre =
    | { error: string }
    | { venta: Awaited<ReturnType<typeof crearVentaTx>>; rondaAntesId: string | null };
  let res: Cierre;
  try {
    res = await prisma.$transaction(
      async (tx): Promise<Cierre> => {
        if (!(await bloquearComandaAbierta(tx, comandaId))) return { error: "Esta mesa não está aberta" };

        const comanda = await tx.comanda.findUniqueOrThrow({
          where: { id: comandaId },
          include: { items: { include: { adicionais: true } } },
        });
        if (comanda.items.length === 0) return { error: "Nenhum item lançado nesta mesa" };

        const consumo = redondear2(comanda.items.reduce((acc, i) => acc + totalItem(i), 0));
        const servicio = comanda.servicio ? redondear2(consumo * TAXA_SERVICO) : 0;
        if (Math.abs(redondear2(consumo + servicio) - data.totalEsperado) >= 0.01) {
          return { error: "A conta mudou enquanto você fechava. Confira os itens e tente de novo." };
        }

        const semRonda = comanda.items.filter((i) => !i.rondaId);
        const rondaAntes = semRonda.length
          ? await tx.ronda.create({
              data: {
                comandaId,
                atendenteId: atendente.id,
                items: { connect: semRonda.map((i) => ({ id: i.id })) },
              },
              select: { id: true },
            })
          : null;

        const venta = await crearVentaTx(tx, {
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

        await tx.comanda.update({
          where: { id: comanda.id },
          data: { estado: "CERRADA", cerradaEn: new Date() },
        });

        return { venta, rondaAntesId: rondaAntes?.id ?? null };
      },
      { timeout: 15_000 }
    );
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro ao fechar a conta" };
  }
  if ("error" in res) return { ok: false, error: res.error };

  // A conta já está fechada: uma falha ao avisar cozinha/estoque não pode virar erro na tela.
  try {
    await publicarVenta(res.venta, false);
    if (res.rondaAntesId) await publicarRonda(res.rondaAntesId);
  } catch (err) {
    console.error("fecharConta: falha ao publicar eventos", err);
  }

  revalidatePath("/mesas");
  revalidatePath(`/mesas/${comandaId}`);
  return { ok: true };
}

export async function sairAtendente() {
  encerrarSessaoAtendente();
  redirect("/mesas/entrar");
}
