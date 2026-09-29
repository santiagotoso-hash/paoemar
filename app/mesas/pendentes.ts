"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Itens "Ainda não lançados" de cada mesa. Ficam só neste aparelho (localStorage)
 * até o atendente apertar "Lançar na mesa", quando viram uma Ronda no banco.
 */
export type ItemPendente = {
  /** Linha única: mesmo produto com opções diferentes = linhas diferentes. */
  chave: string;
  productoId: string;
  nombre: string;
  opcion?: { ids: string[]; nombre: string; precio: number };
  adicionais: { id: string; nombre: string; precio: number }[];
  observacao?: string;
  qtd: number;
  /** Preço base + opção (sem adicionais). */
  precoUnit: number;
};

/** (preço + adicionais) × qtd */
export function totalPendente(item: ItemPendente) {
  return (item.precoUnit + item.adicionais.reduce((acc, a) => acc + a.precio, 0)) * item.qtd;
}

/** Mesma combinação produto + opção + adicionais + observação = mesma linha. */
export function chavePendente(
  productoId: string,
  opcionIds: string[],
  adicionalIds: string[],
  observacao?: string
) {
  return [
    productoId,
    [...opcionIds].sort().join("+"),
    [...adicionalIds].sort().join("+"),
    (observacao ?? "").trim().toLocaleLowerCase("pt-BR"),
  ].join("|");
}

/** Soma na linha existente com a mesma chave, ou cria uma nova. */
export function somarPendente(itens: ItemPendente[], novo: ItemPendente) {
  const existe = itens.some((i) => i.chave === novo.chave);
  return existe
    ? itens.map((i) => (i.chave === novo.chave ? { ...i, qtd: i.qtd + novo.qtd } : i))
    : [...itens, novo];
}

/** Troca a observação de uma linha (a chave muda junto; se colidir com outra linha, soma). */
export function definirObservacao(itens: ItemPendente[], chave: string, observacao: string) {
  const item = itens.find((i) => i.chave === chave);
  if (!item) return itens;
  const obs = observacao.trim() || undefined;
  const novaChave = chavePendente(
    item.productoId,
    item.opcion?.ids ?? [],
    item.adicionais.map((a) => a.id),
    obs
  );
  const resto = itens.filter((i) => i.chave !== chave);
  const atualizado = { ...item, chave: novaChave, observacao: obs };
  // Mantém a posição da linha na lista.
  const idx = itens.indexOf(item);
  if (resto.some((i) => i.chave === novaChave)) return somarPendente(resto, atualizado);
  return [...resto.slice(0, idx), atualizado, ...resto.slice(idx)];
}

const PREFIXO = "mesa-pendentes:";
const EVENTO = "mesa-pendentes";
const VAZIO: ItemPendente[] = [];

function ler(comandaId: string): ItemPendente[] {
  try {
    const raw = localStorage.getItem(PREFIXO + comandaId);
    return raw ? (JSON.parse(raw) as ItemPendente[]) : VAZIO;
  } catch {
    return VAZIO;
  }
}

export function salvarPendentes(comandaId: string, itens: ItemPendente[]) {
  try {
    if (itens.length === 0) localStorage.removeItem(PREFIXO + comandaId);
    else localStorage.setItem(PREFIXO + comandaId, JSON.stringify(itens));
  } catch {
    // armazenamento indisponível (aba anônima, cota): segue só em memória nesta tela
  }
  cache.delete(comandaId);
  window.dispatchEvent(new Event(EVENTO));
}

// useSyncExternalStore exige o mesmo objeto enquanto nada mudou.
const cache = new Map<string, { raw: string | null; itens: ItemPendente[] }>();

function snapshot(comandaId: string) {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PREFIXO + comandaId);
  } catch {}
  const c = cache.get(comandaId);
  if (c && c.raw === raw) return c.itens;
  const itens = ler(comandaId);
  cache.set(comandaId, { raw, itens });
  return itens;
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb); // outras abas
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

export function usePendentes(comandaId: string) {
  const itens = useSyncExternalStore(
    subscribe,
    () => snapshot(comandaId),
    () => VAZIO
  );
  const set = useCallback(
    (next: ItemPendente[] | ((prev: ItemPendente[]) => ItemPendente[])) =>
      salvarPendentes(comandaId, typeof next === "function" ? next(snapshot(comandaId)) : next),
    [comandaId]
  );
  return [itens, set] as const;
}

/** Quantidade de itens pendentes por mesa (para o selo "A lançar" na grade). */
export function usePendentesPorMesa(comandaIds: string[]) {
  const key = comandaIds.join(",");
  const getSnapshot = useCallback(() => {
    return comandaIds.map((id) => snapshot(id).reduce((acc, i) => acc + i.qtd, 0)).join(",");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const serializado = useSyncExternalStore(subscribe, getSnapshot, () => "");
  const contagens = serializado ? serializado.split(",").map(Number) : [];
  return Object.fromEntries(comandaIds.map((id, i) => [id, contagens[i] ?? 0])) as Record<string, number>;
}
