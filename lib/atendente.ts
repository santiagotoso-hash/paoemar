import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Sessão do atendente do salão. Fica POR CIMA da sessão Clerk do aparelho:
 * o aparelho entra com Clerk (rol "mostrador") e cada atendente se identifica com PIN.
 * O cookie guarda só o id do atendente + uma assinatura HMAC.
 */
const COOKIE = "atendente";
const DURACAO_SEG = 60 * 60 * 12; // um turno

function secret() {
  const s = process.env.ATENDENTE_SESSION_SECRET ?? process.env.CLERK_SECRET_KEY;
  if (!s) throw new Error("Falta ATENDENTE_SESSION_SECRET");
  return s;
}

function assinar(valor: string) {
  return createHmac("sha256", secret()).update(valor).digest("hex");
}

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verificarPin(pin: string, pinHash: string) {
  const [salt, hash] = pinHash.split(":");
  if (!salt || !hash) return false;
  const esperado = Buffer.from(hash, "hex");
  const recebido = scryptSync(pin, salt, esperado.length);
  return timingSafeEqual(esperado, recebido);
}

export function iniciarSessaoAtendente(atendenteId: string) {
  cookies().set(COOKIE, `${atendenteId}.${assinar(atendenteId)}`, {
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

export type AtendenteSessao = { id: string; nombre: string };

export async function getAtendenteActual(): Promise<AtendenteSessao | null> {
  const valor = cookies().get(COOKIE)?.value;
  if (!valor) return null;

  const [id, firma] = valor.split(".");
  if (!id || !firma) return null;
  const esperada = Buffer.from(assinar(id));
  const recebida = Buffer.from(firma);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return null;

  const atendente = await prisma.atendente.findUnique({
    where: { id },
    select: { id: true, nombre: true, activo: true },
  });
  if (!atendente?.activo) return null;
  return { id: atendente.id, nombre: atendente.nombre };
}

/** Para server actions: corta se não houver atendente identificado. */
export async function requireAtendente() {
  const atendente = await getAtendenteActual();
  if (!atendente) throw new Error("Entre com seu PIN de atendente");
  return atendente;
}
