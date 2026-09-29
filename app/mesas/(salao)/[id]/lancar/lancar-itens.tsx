"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, NotebookPen, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { nomeMesa } from "@/lib/mesas";
import { Contador } from "../../../contador";
import {
  chavePendente,
  definirObservacao,
  somarPendente,
  totalPendente,
  usePendentes,
  type ItemPendente,
} from "../../../pendentes";
import { ObservacaoSheet } from "../../../observacao";
import { OpcoesSheet } from "./opcoes-sheet";

type Opcao = { id: string; nombre: string; precio: number };

export type ProdutoMesa = {
  id: string;
  nombre: string;
  precio: number;
  categoriaId: string;
  adicionais: Opcao[];
  grupos: { id: string; nombre: string; obligatorio: boolean; opciones: Opcao[] }[];
};

type Mesa = { id: string; codigo: string; tipo: "NUMERO" | "NOMBRE"; personas: number | null };
type Categoria = { id: string; nombre: string; icono: string | null };

/** Busca sem acento e sem maiúsculas: "acai" encontra "Açaí". */
function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");
}

function temOpcoes(p: ProdutoMesa) {
  return p.grupos.length > 0 || p.adicionais.length > 0;
}

/** "a partir de": preço base + opção mais barata de cada grupo obrigatório. */
function precoMinimo(p: ProdutoMesa) {
  return (
    p.precio +
    p.grupos
      .filter((g) => g.obligatorio && g.opciones.length > 0)
      .reduce((acc, g) => acc + Math.min(...g.opciones.map((o) => o.precio)), 0)
  );
}

export function LancarItens({
  mesa,
  categorias,
  produtos,
}: {
  mesa: Mesa;
  categorias: Categoria[];
  produtos: ProdutoMesa[];
}) {
  const [pendentes, setPendentes] = usePendentes(mesa.id);
  const [busca, setBusca] = useState("");
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [produtoAberto, setProdutoAberto] = useState<ProdutoMesa | null>(null);
  const [editandoObs, setEditandoObs] = useState<ItemPendente | null>(null);

  const visiveis = useMemo(() => {
    const q = normalizar(busca.trim());
    return produtos.filter(
      (p) => (!categoriaId || p.categoriaId === categoriaId) && (!q || normalizar(p.nombre).includes(q))
    );
  }, [produtos, busca, categoriaId]);

  const qtdTotal = pendentes.reduce((acc, i) => acc + i.qtd, 0);
  const valorTotal = pendentes.reduce((acc, i) => acc + totalPendente(i), 0);

  function qtdNoPedido(productoId: string) {
    return pendentes.filter((i) => i.productoId === productoId).reduce((acc, i) => acc + i.qtd, 0);
  }

  /** Produto simples: uma única linha sem opções, controlada pelo contador. */
  const chaveSimples = (p: ProdutoMesa) => chavePendente(p.id, [], []);

  function mudarSimples(p: ProdutoMesa, qtd: number) {
    const chave = chaveSimples(p);
    setPendentes((prev) => {
      if (qtd <= 0) return prev.filter((i) => i.chave !== chave);
      if (prev.some((i) => i.chave === chave)) return prev.map((i) => (i.chave === chave ? { ...i, qtd } : i));
      return [...prev, { chave, productoId: p.id, nombre: p.nombre, adicionais: [], qtd, precoUnit: p.precio }];
    });
  }

  const titulo = nomeMesa(mesa.tipo, mesa.codigo);

  return (
    <div className="flex flex-col gap-4 pb-28">
      <div className="flex items-center gap-2">
        <Link
          href={`/mesas/${mesa.id}`}
          aria-label={`Voltar para a comanda da ${titulo}`}
          className="-ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Lançando itens para</p>
          <h1 className="truncate text-2xl font-semibold leading-tight">{titulo}</h1>
        </div>
        {mesa.personas && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-3 py-1 text-sm">
            <Users className="size-4 text-primary" aria-hidden />
            {mesa.personas} {mesa.personas === 1 ? "pessoa" : "pessoas"}
          </span>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto"
          aria-label="Buscar produto"
          className="h-11 rounded-xl bg-card pl-10 text-base"
        />
      </div>

      <div role="group" aria-label="Categorias" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {[{ id: null, nombre: "Todas", icono: null } as const, ...categorias].map((c) => {
          const ativo = categoriaId === c.id;
          return (
            <button
              key={c.id ?? "todas"}
              type="button"
              aria-pressed={ativo}
              onClick={() => setCategoriaId(c.id)}
              className={cn(
                "min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                ativo
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {c.icono ? `${c.icono} ` : ""}
              {c.nombre}
            </button>
          );
        })}
      </div>

      {visiveis.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum produto encontrado.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-2xl border bg-card">
          {visiveis.map((p) => {
            const comOpcoes = temOpcoes(p);
            const linhaSimples = comOpcoes ? undefined : pendentes.find((i) => i.chave === chaveSimples(p));
            const qtd = comOpcoes ? qtdNoPedido(p.id) : (linhaSimples?.qtd ?? 0);
            // Linhas deste produto com observação/opções (a linha "simples" fica no contador).
            const linhasDetalhe = pendentes.filter((i) => i.productoId === p.id && i.chave !== linhaSimples?.chave);
            return (
              <li key={p.id} className="flex flex-col gap-1 px-3 py-2">
                <div className="flex min-h-12 items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{p.nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    {comOpcoes && p.grupos.length > 0 ? "a partir de " : ""}
                    {formatBRL(comOpcoes ? precoMinimo(p) : p.precio)}
                    {comOpcoes && qtd > 0 && (
                      <span className="ml-2 font-medium text-primary">· {qtd} no pedido</span>
                    )}
                  </p>
                </div>
                {!comOpcoes && (
                  <Button
                    variant="ghost"
                    size="icon-touch"
                    aria-label={
                      linhaSimples ? `Escrever observação em ${p.nombre}` : `Adicionar ${p.nombre} com observação`
                    }
                    onClick={() => (linhaSimples ? setEditandoObs(linhaSimples) : setProdutoAberto(p))}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <NotebookPen />
                  </Button>
                )}
                {comOpcoes ? (
                  <Button
                    variant="outline"
                    size="icon-touch"
                    aria-label={`Escolher opções de ${p.nombre}`}
                    onClick={() => setProdutoAberto(p)}
                    className="border-primary/40 text-primary"
                  >
                    <Plus />
                  </Button>
                ) : qtd > 0 ? (
                  <Contador
                    valor={qtd}
                    min={1}
                    onChange={(v) => mudarSimples(p, v)}
                    onRemover={() => mudarSimples(p, 0)}
                    nome={p.nombre}
                  />
                ) : (
                  <Button
                    variant="outline"
                    size="icon-touch"
                    aria-label={`Adicionar ${p.nombre}`}
                    onClick={() => mudarSimples(p, 1)}
                    className="border-primary/40 text-primary"
                  >
                    <Plus />
                  </Button>
                )}
                </div>
                {linhasDetalhe.length > 0 && (
                  <ul className="flex flex-col gap-1 pb-1">
                    {linhasDetalhe.map((i) => (
                      <li key={i.chave}>
                        <button
                          type="button"
                          onClick={() => setEditandoObs(i)}
                          aria-label={`Editar observação: ${i.qtd} ${p.nombre}`}
                          className="flex min-h-11 w-full items-center gap-2 rounded-xl bg-accent px-3 text-left text-xs"
                        >
                          <span className="font-semibold text-primary">{i.qtd}×</span>
                          <span className="min-w-0 flex-1 truncate">
                            {[i.opcion?.nombre, ...i.adicionais.map((a) => `+ ${a.nombre}`)]
                              .filter(Boolean)
                              .join(" · ")}
                            {i.observacao && <span className="italic"> “{i.observacao}”</span>}
                            {!i.opcion && i.adicionais.length === 0 && !i.observacao && "sem observação"}
                          </span>
                          <NotebookPen className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ObservacaoSheet
        item={editandoObs}
        onClose={() => setEditandoObs(null)}
        onSalvar={(chave, obs) => {
          setPendentes((prev) => definirObservacao(prev, chave, obs));
          setEditandoObs(null);
        }}
      />

      <OpcoesSheet
        produto={produtoAberto}
        onClose={() => setProdutoAberto(null)}
        onAdicionar={(item) => {
          setPendentes((prev) => somarPendente(prev, item));
          setProdutoAberto(null);
        }}
      />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-md px-4 py-3">
          {qtdTotal > 0 ? (
            <Link
              href={`/mesas/${mesa.id}`}
              className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-primary px-4 text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <span className="flex items-center gap-2 font-medium">
                <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-primary-foreground/20 px-2 text-sm tabular-nums">
                  {qtdTotal}
                </span>
                Revisar e lançar
              </span>
              <span className="flex items-center gap-1 font-semibold tabular-nums">
                {formatBRL(valorTotal)}
                <ChevronRight className="size-5" />
              </span>
            </Link>
          ) : (
            <p className="flex min-h-12 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              Toque em + para adicionar itens
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
