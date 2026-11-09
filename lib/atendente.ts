import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export { hashPin, verificarPin } from "@/lib/pin";

/**
 * Sessão do atendente do salão. Fica POR CIMA da sessão Clerk do aparelho:
 * o aparelho entra com Clerk (rol "mostrador") e cada atendente se identifica com PIN.
 * O cookie guarda `id.emitidoEm.assinatura`. A assinatura cobre também o usuário
 * Clerk do aparelho e o hash do PIN: trocar o PIN ou sair do Clerk invalida a sessão,
 * e a validade é conferida aqui no servidor (não só pelo maxAge do navegador).
 */
const COOKIE = "atendente";
const DURACAO_SEG = 60 * 60 * 12; // um turno

function secret() {
  // `||` e não `??`: variável criada mas vazia (ex.: copiada do .env.example) também cai no CLERK_SECRET_KEY.
  const s = process.env.ATENDENTE_SESSION_SECRET || process.env.CLERK_SECRET_KEY;
  if (!s) throw new Error("Falta ATENDENTE_SESSION_SECRET");
  return s;
}

function assinar(valor: string) {
  return createHmac("sha256", secret()).update(valor).digest("hex");
}

function assinaturaSessao(atendenteId: string, emitidoEm: string, clerkUserId: string, pinHash: string) {
  return assinar([atendenteId, emitidoEm, clerkUserId, pinHash].join("."));
}

/** Contador de tentativas de PIN no Redis (trocar o PIN no admin zera o bloqueio). */
/**
 * Contador separado para o PIN de supervisor usado ao autorizar (cancelamento, liberar mesa),
 * por quem pede: errar a autorização não bloqueia o login do supervisor nem os outros atendentes.
 */
export function chaveTentativasAutorizacao(supervisorId: string, solicitanteId: string) {
  return `pin-autorizacao:${supervisorId}:${solicitanteId}`;
}

export function chaveTentativasPin(atendenteId: string) {
  return `pin-tentativas:${atendenteId}`;
}

export function iniciarSessaoAtendente(
  atendente: { id: string; pinHash: string },
  clerkUserId: string
) {
  const emitidoEm = String(Date.now());
  const firma = assinaturaSessao(atendente.id, emitidoEm, clerkUserId, atendente.pinHash);
  cookies().set(COOKIE, `${atendente.id}.${emitidoEm}.${firma}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_SEG,
  });
}

export function encerrarSessaoAtendente() {
  cookies().delete(COOKIE);
}

/** supervisor: pode modificar mesas de outros atendentes. */
export type AtendenteSessao = { id: string; nombre: string; supervisor: boolean };

export async function getAtendenteActual(): Promise<AtendenteSessao | null> {
  const valor = cookies().get(COOKIE)?.value;
  if (!valor) return null;

  const [id, emitidoEm, firma] = valor.split(".");
  if (!id || !emitidoEm || !firma) return null;
  const idade = Date.now() - Number(emitidoEm);
  if (!Number.isFinite(idade) || idade < 0 || idade > DURACAO_SEG * 1000) return null;

  const { userId } = await auth();
  if (!userId) return null;

  const atendente = await prisma.atendente.findUnique({
    where: { id },
    select: { id: true, nombre: true, activo: true, pinHash: true, supervisor: true },
  });
  if (!atendente?.activo) return null;

  const esperada = Buffer.from(assinaturaSessao(id, emitidoEm, userId, atendente.pinHash));
  const recebida = Buffer.from(firma);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return null;
  return { id: atendente.id, nombre: atendente.nombre, supervisor: atendente.supervisor };
}

/** Para server actions: corta se não houver atendente identificado. */
export async function requireAtendente() {
  const atendente = await getAtendenteActual();
  if (!atendente) throw new Error("Entre com seu PIN de atendente");
  return atendente;
}

/**
 * Regra de posse: só quem abriu a mesa (ou um supervisor) pode modificá-la.
 * Os outros atendentes só veem. Mesas antigas sem dono ficam livres.
 */
export function podeModificarMesa(atendente: AtendenteSessao, donoId: string | null) {
  return !donoId || donoId === atendente.id || atendente.supervisor;
}

/** Para server actions: devolve a mensagem de erro se o atendente não pode modificar a mesa. */
export async function conferirDonoDaMesa(atendente: AtendenteSessao, comandaId: string) {
  const comanda = await prisma.comanda.findUnique({
    where: { id: comandaId },
    select: { atendenteId: true, atendente: { select: { nombre: true } } },
  });
  if (!comanda) return "Mesa não encontrada";
  if (podeModificarMesa(atendente, comanda.atendenteId)) return null;
  return `Esta mesa é de ${comanda.atendente?.nombre ?? "outro atendente"}. Você só pode visualizar.`;
}
