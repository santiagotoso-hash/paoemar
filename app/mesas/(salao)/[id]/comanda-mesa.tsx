"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, ChefHat, Clock, DoorOpen, Eye, Minus, NotebookPen, Plus, Printer, Send, Trash2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatBRL, formatHora, redondear2, tempoDesde } from "@/lib/format";
import { dividirConta, nomeMesa, TAXA_SERVICO } from "@/lib/mesas";
import type { BandeiraValue, MetodoPagoValue } from "@/lib/metodos-pago";
import { FormaPagamento, pagamentoCompleto } from "@/components/forma-pagamento";
import { Contador } from "../../contador";
import { definirObservacao, totalPendente, usePendentes, type ItemPendente } from "../../pendentes";
import { lancarPendentes } from "../../lancar-pendentes";
import { useMesaSomenteLeitura } from "../../guarda-saida-mesa";
import { ObservacaoSheet } from "../../observacao";
import { CancelarItemSheet } from "./cancelar-item-sheet";
import { LiberarMesaSheet } from "./liberar-mesa-sheet";
import { alterarPessoas, alternarServico, fecharConta, imprimirPreconta } from "../../actions";

type Estado = "RECIBIDO" | "EN_PREPARACION" | "LISTO" | "ENTREGADO";

export type ItemLancado = {
  id: string;
  nombre: string;
  qtd: number;
  opcion: string | null;
  adicionais: string[];
  observacao: string | null;
  total: number;
};

export type RodadaView = {
  id: string;
  titulo: string;
  horario: string | null;
  atendente: string | null;
  estado: Estado | null;
  itens: ItemLancado[];
};

type Mesa = {
  id: string;
  codigo: string;
  tipo: "NUMERO" | "NOMBRE";
  personas: number | null;
  abertaEm: string;
  atendente: string | null;
  servicio: boolean;
};

const ESTADO: Record<Estado, { label: string; className: string }> = {
  RECIBIDO: { label: "Enviado à cozinha", className: "bg-muted text-muted-foreground" },
  EN_PREPARACION: { label: "Em preparo", className: "bg-accent text-primary" },
  LISTO: { label: "Pronto", className: "bg-primary text-primary-foreground" },
  ENTREGADO: { label: "Entregue", className: "bg-secondary text-foreground" },
};

export type CancelamentoView = {
  id: string;
  nombre: string;
  detalhe: string | null;
  qtd: number;
  valor: number;
  motivo: string;
  supervisor: string;
  horario: string;
};

export function ComandaMesa({
  mesa,
  rodadas,
  supervisores,
  cancelamentos,
  somenteLeitura = false,
}: {
  mesa: Mesa;
  rodadas: RodadaView[];
  supervisores: { id: string; nombre: string }[];
  cancelamentos: CancelamentoView[];
  /** Mesa de outro atendente: vê tudo, não modifica nada. */
  somenteLeitura?: boolean;
}) {
  const router = useRouter();
  const [pendentes, setPendentes] = usePendentes(mesa.id);
  const [lancando, setLancando] = useState(false);
  const [servico, setServico] = useState(mesa.servicio);
  const [fechando, setFechando] = useState(false);
  const [editandoObs, setEditandoObs] = useState<ItemPendente | null>(null);
  const [pessoas, setPessoas] = useState(mesa.personas ?? 1);
  const [cancelando, setCancelando] = useState<ItemLancado | null>(null);
  const [liberando, setLiberando] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());

  // Status das rodadas muda na cozinha: atualiza periodicamente.
  useEffect(() => {
    const t = setInterval(() => {
      setAgora(Date.now());
      router.refresh();
    }, 20_000);
    return () => clearInterval(t);
  }, [router]);

  useEffect(() => setServico(mesa.servicio), [mesa.servicio]);

  const titulo = nomeMesa(mesa.tipo, mesa.codigo);
  const totalPendentes = pendentes.reduce((acc, i) => acc + totalPendente(i), 0);
  // Mesmo cálculo do servidor em fecharConta (ele confere este total antes de cobrar).
  const consumo = redondear2(rodadas.reduce((acc, r) => acc + r.itens.reduce((a, i) => a + i.total, 0), 0));
  const valorServico = servico ? redondear2(consumo * TAXA_SERVICO) : 0;
  const totalMesa = redondear2(consumo + valorServico);
  const temLancados = rodadas.some((r) => r.itens.length > 0);

  function mudarQtd(chave: string, qtd: number) {
    setPendentes((prev) =>
      qtd <= 0 ? prev.filter((i) => i.chave !== chave) : prev.map((i) => (i.chave === chave ? { ...i, qtd } : i))
    );
  }

  async function handleLancar() {
    setLancando(true);
    try {
      const res = await lancarPendentes(mesa.id, pendentes);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Rodada enviada à cozinha");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao lançar os itens");
    } finally {
      setLancando(false);
    }
  }

  async function handlePessoas(valor: number) {
    const anterior = pessoas;
    setPessoas(valor);
    try {
      await alterarPessoas(mesa.id, valor);
    } catch {
      setPessoas(anterior);
      toast.error("Não foi possível alterar o número de pessoas");
    }
  }

  async function handleServico(valor: boolean) {
    setServico(valor);
    try {
      await alternarServico(mesa.id, valor);
    } catch {
      setServico(!valor);
      toast.error("Não foi possível alterar o serviço");
    }
  }

  const [imprimindoPreconta, setImprimindoPreconta] = useState(false);

  async function handlePreconta() {
    setImprimindoPreconta(true);
    try {
      const res = await imprimirPreconta(mesa.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Pré-conta enviada para a impressora do caixa");
      if (pendentes.length > 0) toast.info("Os itens pendentes (ainda não lançados) não entram na pré-conta.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível imprimir a pré-conta");
    } finally {
      setImprimindoPreconta(false);
    }
  }

  useMesaSomenteLeitura(mesa.id, somenteLeitura);

  return (
    <div className="flex flex-col gap-5 pb-28">
      {/* Cabeçalho */}
      <div className="flex items-start gap-2">
        <Link
          href="/mesas"
          aria-label="Voltar para as mesas"
          className="-ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold leading-tight">{titulo}</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1" suppressHydrationWarning>
              <Clock className="size-3.5" aria-hidden />
              Aberta {tempoDesde(mesa.abertaEm, agora)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden />
              {pessoas} {pessoas === 1 ? "pessoa" : "pessoas"}
            </span>
            {mesa.atendente && <span>· {mesa.atendente}</span>}
          </p>
        </div>
      </div>

      {somenteLeitura && (
        <p role="status" className="flex items-start gap-2 rounded-xl border bg-muted p-3 text-sm">
          <Eye className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>
            Mesa de <strong>{mesa.atendente ?? "outro atendente"}</strong>. Você pode ver a conta, mas só quem abriu a
            mesa ou um supervisor pode alterar.
          </span>
        </p>
      )}

      {/* Ainda não lançados */}
      {!somenteLeitura && pendentes.length > 0 && (
        <section
          aria-labelledby="pendentes-titulo"
          className="flex flex-col gap-3 rounded-2xl border-2 border-primary/50 bg-accent p-3"
        >
          <div className="flex items-center justify-between">
            <h2 id="pendentes-titulo" className="text-lg font-semibold">
              Ainda não lançados
            </h2>
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              A lançar
            </span>
          </div>
          <ul className="flex flex-col divide-y divide-primary/15">
            {pendentes.map((i) => (
              <li key={i.chave} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{i.nombre}</p>
                  <DetalheItem opcion={i.opcion?.nombre} adicionais={i.adicionais.map((a) => a.nombre)} observacao={i.observacao} />
                  <p className="text-sm font-medium">{formatBRL(totalPendente(i))}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-touch"
                  aria-label={i.observacao ? `Editar observação de ${i.nombre}` : `Escrever observação em ${i.nombre}`}
                  onClick={() => setEditandoObs(i)}
                  className={i.observacao ? "text-primary" : "text-muted-foreground hover:text-primary"}
                >
                  <NotebookPen />
                </Button>
                <Contador
                  valor={i.qtd}
                  min={1}
                  onChange={(v) => mudarQtd(i.chave, v)}
                  onRemover={() => mudarQtd(i.chave, 0)}
                  nome={i.nombre}
                />
              </li>
            ))}
          </ul>
          <Button size="touch" className="w-full" onClick={handleLancar} disabled={lancando}>
            <Send />
            {lancando ? "Lançando..." : `Lançar na mesa · ${formatBRL(totalPendentes)}`}
          </Button>
        </section>
      )}

      {/* Já lançados */}
      <section aria-labelledby="lancados-titulo" className="flex flex-col gap-3">
        <h2 id="lancados-titulo" className="text-lg font-semibold">
          Já lançados
        </h2>
        {!temLancados ? (
          <p className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            Nenhum item lançado ainda.
          </p>
        ) : (
          rodadas.map((r) => (
            <div key={r.id} className="rounded-2xl border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
                <p className="text-sm">
                  <span className="font-semibold">{r.titulo}</span>
                  {r.horario && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {formatHora(r.horario)}
                      {r.atendente && ` · ${r.atendente}`}
                    </span>
                  )}
                </p>
                {r.estado && <StatusRodada estado={r.estado} />}
              </div>
              <ul className="flex flex-col divide-y">
                {r.itens.map((i) => (
                  <li key={i.id} className="flex gap-3 px-3 py-2">
                    <span className="w-7 shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
                      {i.qtd}×
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{i.nombre}</p>
                      <DetalheItem opcion={i.opcion} adicionais={i.adicionais} observacao={i.observacao} />
                    </div>
                    <span className="shrink-0 text-sm tabular-nums">{formatBRL(i.total)}</span>
                    {!somenteLeitura && (
                    <Button
                      variant="ghost"
                      size="icon-touch"
                      aria-label={`Cancelar ${i.nombre}`}
                      onClick={() => setCancelando(i)}
                      className="-my-2 -mr-2 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      {/* Cancelados (registro visível na própria mesa) */}
      {cancelamentos.length > 0 && (
        <section aria-labelledby="cancelados-titulo" className="flex flex-col gap-2">
          <h2 id="cancelados-titulo" className="text-base font-semibold text-muted-foreground">
            Cancelados
          </h2>
          <ul className="flex flex-col divide-y rounded-2xl border border-dashed">
            {cancelamentos.map((c) => (
              <li key={c.id} className="flex gap-3 px-3 py-2 text-sm text-muted-foreground">
                <span className="w-7 shrink-0 font-semibold tabular-nums">{c.qtd}×</span>
                <div className="min-w-0 flex-1">
                  <p className="line-through">{c.nombre}</p>
                  <p className="text-xs">
                    “{c.motivo}” · {c.supervisor} · {formatHora(c.horario)}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums line-through">{formatBRL(c.valor)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Resumo */}
      <section aria-label="Resumo da conta" className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Consumo lançado</span>
          <span className="tabular-nums">{formatBRL(consumo)}</span>
        </div>
        <div className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <label htmlFor="servico" className="flex flex-1 cursor-pointer flex-col">
            <span className="text-muted-foreground">Serviço ({Math.round(TAXA_SERVICO * 100)}%)</span>
            {!servico && <span className="text-xs text-muted-foreground">Removido a pedido do cliente</span>}
          </label>
          <span className={cn("tabular-nums", !servico && "text-muted-foreground line-through")}>
            {formatBRL(servico ? valorServico : Math.round(consumo * TAXA_SERVICO * 100) / 100)}
          </span>
          {!somenteLeitura && (
            <Switch id="servico" checked={servico} onChange={handleServico} label="Cobrar serviço" />
          )}
        </div>
        <div className="mt-1 flex items-baseline justify-between border-t pt-3">
          <span className="font-heading text-lg font-semibold">Total da mesa</span>
          <span className="font-heading text-2xl font-semibold tabular-nums">{formatBRL(totalMesa)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 border-t pt-3">
          <div className="text-sm">
            <p className="font-medium">Pessoas na mesa</p>
            {pessoas > 1 && <PorPessoa total={totalMesa} pessoas={pessoas} className="text-muted-foreground" />}
          </div>
          {somenteLeitura ? (
            <span className="text-base font-semibold tabular-nums">{pessoas}</span>
          ) : (
            <Contador valor={pessoas} onChange={handlePessoas} min={1} nome="pessoas na mesa" />
          )}
        </div>
        {temLancados && (
          <Button
            type="button"
            variant="outline"
            size="touch"
            className="mt-2 w-full"
            onClick={handlePreconta}
            disabled={imprimindoPreconta}
          >
            <Printer />
            {imprimindoPreconta ? "Enviando..." : "Imprimir pré-conta"}
          </Button>
        )}
      </section>

      {/* Ações fixas (só para quem pode modificar a mesa) */}
      {!somenteLeitura && (
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-md flex-col gap-1 px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="touch"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/mesas/${mesa.id}/lancar`} />}
            >
              <Plus />
              Adicionar itens
            </Button>
            {!temLancados && pendentes.length === 0 ? (
              // Mesa vazia: não há o que cobrar, só liberar.
              <Button size="touch" variant="secondary" onClick={() => setLiberando(true)}>
                <DoorOpen />
                Liberar mesa
              </Button>
            ) : (
              <Button size="touch" onClick={() => setFechando(true)} disabled={pendentes.length > 0 || !temLancados}>
                Fechar conta
              </Button>
            )}
          </div>
          {pendentes.length > 0 && (
            <p className="text-center text-xs text-muted-foreground">Lance os itens pendentes antes de fechar a conta.</p>
          )}
        </div>
      </div>
      )}

      <ObservacaoSheet
        item={editandoObs}
        onClose={() => setEditandoObs(null)}
        onSalvar={(chave, obs) => {
          setPendentes((prev) => definirObservacao(prev, chave, obs));
          setEditandoObs(null);
        }}
      />

      <LiberarMesaSheet
        open={liberando}
        onOpenChange={setLiberando}
        mesaId={mesa.id}
        titulo={titulo}
        precisaSupervisor={cancelamentos.length > 0}
        supervisores={supervisores}
        onLiberada={() => {
          toast.success(`${titulo} liberada`);
          router.push("/mesas");
          router.refresh();
        }}
      />

      <CancelarItemSheet
        item={cancelando}
        mesaId={mesa.id}
        supervisores={supervisores}
        onClose={() => setCancelando(null)}
        onCancelado={() => {
          setCancelando(null);
          router.refresh();
        }}
      />

      <FecharContaDialog
        open={fechando}
        onOpenChange={setFechando}
        mesaId={mesa.id}
        titulo={titulo}
        consumo={consumo}
        servico={valorServico}
        total={totalMesa}
        pessoas={pessoas}
        onFechada={() => {
          setPendentes([]);
          toast.success(`Conta da ${titulo} fechada`);
          router.push("/mesas");
          router.refresh();
        }}
      />
    </div>
  );
}

function DetalheItem({
  opcion,
  adicionais,
  observacao,
}: {
  opcion?: string | null;
  adicionais: string[];
  observacao?: string | null;
}) {
  if (!opcion && adicionais.length === 0 && !observacao) return null;
  return (
    <div className="text-xs text-muted-foreground">
      {(opcion || adicionais.length > 0) && (
        <p>{[opcion, ...adicionais.map((a) => `+ ${a}`)].filter(Boolean).join(" · ")}</p>
      )}
      {observacao && <p className="italic">“{observacao}”</p>}
    </div>
  );
}

function StatusRodada({ estado }: { estado: Estado }) {
  const e = ESTADO[estado];
  const Icone = estado === "ENTREGADO" ? Check : ChefHat;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", e.className)}>
      <Icone className="size-3.5" aria-hidden />
      {e.label}
    </span>
  );
}

function Switch({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center"
    >
      <span
        className={cn(
          "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
          checked ? "bg-primary" : "bg-border"
        )}
      >
        <span
          className={cn(
            "inline-block size-5 rounded-full bg-card shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </span>
    </button>
  );
}

/** "R$ 33,33 por pessoa" (+ quem paga o centavo que sobra, para a soma bater). */
function PorPessoa({
  total,
  pessoas,
  destaque,
  className,
}: {
  total: number;
  pessoas: number;
  destaque?: boolean;
  className?: string;
}) {
  const { porPessoa, comCentavoExtra } = dividirConta(total, pessoas);
  return (
    <div className={className}>
      <p className={destaque ? "font-heading text-xl font-semibold tabular-nums" : "tabular-nums"}>
        {formatBRL(porPessoa)} {destaque ? "" : "por pessoa"}
        {destaque && <span className="ml-1 font-sans text-xs font-normal text-muted-foreground">por pessoa</span>}
      </p>
      {comCentavoExtra > 0 && (
        <p className="text-xs text-muted-foreground">
          {comCentavoExtra === 1 ? "1 pessoa paga" : `${comCentavoExtra} pessoas pagam`}{" "}
          {formatBRL(porPessoa + 0.01)}
        </p>
      )}
    </div>
  );
}

function FecharContaDialog({
  open,
  onOpenChange,
  mesaId,
  titulo,
  consumo,
  servico,
  total,
  pessoas,
  onFechada,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mesaId: string;
  titulo: string;
  consumo: number;
  servico: number;
  total: number;
  pessoas: number;
  onFechada: () => void;
}) {
  const [metodoPago, setMetodoPago] = useState<MetodoPagoValue>("EFECTIVO");
  const [bandeira, setBandeira] = useState<BandeiraValue | null>(null);
  const [loading, setLoading] = useState(false);
  // Desconto (−) ou adicional (+): o valor é digitado sem sinal; o botão ou um "-"/"+" digitado escolhe o sinal.
  const [ajusteTexto, setAjusteTexto] = useState("");
  const [negativo, setNegativo] = useState(true);

  const valorAjuste = Number(ajusteTexto.replace(",", ".")) || 0;
  const ajuste = redondear2(negativo ? -valorAjuste : valorAjuste);
  const totalFinal = redondear2(total + ajuste);
  const ajusteInvalido = totalFinal < 0;

  function digitarAjuste(texto: string) {
    if (texto.includes("-")) setNegativo(true);
    else if (texto.includes("+")) setNegativo(false);
    // Só dígitos e uma vírgula, até 2 casas decimais.
    const limpo = texto.replace(/[^\d.,]/g, "").replace(".", ",");
    const [inteiro, ...resto] = limpo.split(",");
    setAjusteTexto(resto.length ? `${inteiro},${resto.join("").slice(0, 2)}` : inteiro);
  }

  async function handleConfirmar() {
    setLoading(true);
    try {
      const res = await fecharConta(mesaId, { metodoPago, bandeira, ajuste, totalEsperado: totalFinal });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onOpenChange(false);
      onFechada();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao fechar a conta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg">Fechar conta · {titulo}</DialogTitle>
          <DialogDescription>Confira o valor e a forma de pagamento.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consumo</span>
              <span className="tabular-nums">{formatBRL(consumo)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Serviço</span>
              <span className="tabular-nums">{formatBRL(servico)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="ajuste-conta" className="flex flex-col">
                <span className="text-muted-foreground">Desconto / adicional</span>
                <span className={cn("text-xs", ajuste < 0 ? "text-primary" : "text-muted-foreground")}>
                  {ajuste < 0 ? "Desconto" : ajuste > 0 ? "Adicional" : "Opcional"}
                </span>
              </label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-touch"
                  onClick={() => setNegativo((n) => !n)}
                  aria-label={negativo ? "Desconto (toque para adicional)" : "Adicional (toque para desconto)"}
                >
                  {negativo ? <Minus /> : <Plus />}
                </Button>
                <Input
                  id="ajuste-conta"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0,00"
                  value={ajusteTexto}
                  onChange={(e) => digitarAjuste(e.target.value)}
                  aria-invalid={ajusteInvalido}
                  className="h-11 w-28 rounded-xl text-right text-base tabular-nums"
                />
              </div>
            </div>
            {ajusteInvalido && (
              <p className="text-xs text-destructive">O desconto não pode ser maior que o valor da conta.</p>
            )}
            <div className="mt-1 flex justify-between border-t pt-2 text-lg font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatBRL(totalFinal)}</span>
            </div>
          </div>
          {pessoas > 1 && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-accent p-3">
              <div className="flex items-center gap-2 text-sm">
                <Users className="size-4 text-primary" aria-hidden />
                <span>
                  Dividido por <strong>{pessoas}</strong>
                  {servico > 0 && <span className="block text-xs text-muted-foreground">com serviço incluído</span>}
                </span>
              </div>
              <PorPessoa total={totalFinal} pessoas={pessoas} className="text-right" destaque />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>Forma de pagamento</Label>
            <FormaPagamento metodo={metodoPago} onMetodo={setMetodoPago} bandeira={bandeira} onBandeira={setBandeira} />
          </div>
        </div>
        <DialogFooter>
          <Button size="touch" onClick={handleConfirmar} disabled={loading || ajusteInvalido || !pagamentoCompleto(metodoPago, bandeira)}>
            {loading ? "Fechando..." : `Confirmar pagamento · ${formatBRL(totalFinal)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
