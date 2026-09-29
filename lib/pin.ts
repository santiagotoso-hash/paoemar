import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/** Só crypto, sem Next/Clerk: também é usado pelos seeds (rodam fora do Next). */
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
