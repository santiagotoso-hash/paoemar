"use client";

import { claveDeEnvio, salvarPendentes, type ItemPendente } from "./pendentes";
import { lancarRonda } from "./actions";

/**
 * Envia os itens pendentes da mesa como uma rodada e limpa o aparelho se deu certo.
 * Usado pelo botão "Lançar na mesa" e pelo aviso ao tentar sair da mesa.
 */
export async function lancarPendentes(mesaId: string, pendentes: ItemPendente[]) {
  const itens = pendentes.map((i) => ({
    productoId: i.productoId,
    opcionIds: i.opcion?.ids ?? [],
    adicionalIds: i.adicionais.map((a) => a.id),
    observacao: i.observacao,
    qtd: i.qtd,
  }));
  const clave = claveDeEnvio(mesaId, JSON.stringify(itens));
  const res = await lancarRonda(mesaId, { clave, itens });
  if (res.ok) salvarPendentes(mesaId, []);
  return res;
}
