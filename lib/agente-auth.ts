import { timingSafeEqual } from "node:crypto";

/**
 * O agente de impressão da loja não tem login: autentica com um token compartilhado
 * (PRINT_AGENT_TOKEN, o mesmo no servidor e no programa da loja). Devolve a resposta de erro
 * se a chamada não for válida, ou null se pode seguir.
 */
export function conferirAgente(req: Request): Response | null {
  const esperado = process.env.PRINT_AGENT_TOKEN;
  if (!esperado) return new Response("Impressão automática não configurada (PRINT_AGENT_TOKEN)", { status: 503 });

  const recebido = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response("Unauthorized", { status: 401 });
  return null;
}
