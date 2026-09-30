import { NextResponse, type NextRequest } from "next/server";
import { encerrarSessaoAtendente } from "@/lib/atendente";
import { voltarSeguro } from "@/lib/inatividade";

/**
 * Encerramento por inatividade. É uma rota (e não server action) de propósito:
 * apagar o cookie numa server action faz o Next re-renderizar a página, e o layout
 * do salão redireciona no meio da resposta. Aqui é um POST só: apaga e redireciona.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const atendente = String(form.get("atendente") ?? "");
  const voltar = voltarSeguro(String(form.get("voltar") ?? ""));

  encerrarSessaoAtendente();

  const destino = new URL("/mesas/entrar", req.url);
  if (atendente) destino.searchParams.set("atendente", atendente);
  destino.searchParams.set("voltar", voltar);
  destino.searchParams.set("motivo", "inatividade");
  // 303: o navegador segue com GET.
  return NextResponse.redirect(destino, 303);
}
