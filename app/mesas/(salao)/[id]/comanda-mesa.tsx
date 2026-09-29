"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, ChefHat, Clock, NotebookPen, Plus, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatBRL, formatHora, tempoDesde } from "@/lib/format";
import { nomeMesa, TAXA_SERVICO } from "@/lib/mesas";
import { METODOS_PAGO, type MetodoPagoValue } from "@/lib/metodos-pago";
import { Contador } from "../../contador";
import { definirObservacao, totalPendente, usePendentes, type ItemPendente } from "../../pendentes";
import { ObservacaoSheet } from "../../observacao";
import { alternarServico, fecharConta, lancarRonda } from "../../actions";

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

export function ComandaMesa({ mesa, rodadas }: { mesa: Mesa; rodadas: RodadaView[] }) {
  const router = useRouter();
  const [pendentes, setPendentes] = usePendentes(mesa.id);
  const [lancando, setLancando] = useState(false);
  const [servico, setServico] = useState(mesa.servicio);
  const [fechando, setFechando] = useState(false);
  const [editandoObs, setEditandoObs] = useState<ItemPendente | null>(null);
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
  const consumo = rodadas.reduce((acc, r) => acc + r.itens.reduce((a, i) => a + i.total, 0), 0);
  const valorServico = servico ? Math.round(consumo * TAXA_SERVICO * 100) / 100 : 0;
  const totalMesa = consumo + valorServico;
  const temLancados = rodadas.some((r) => r.itens.length > 0);

  function mudarQtd(chave: string, qtd: number) {
    setPendentes((prev) =>
      qtd <= 0 ? prev.filter((i) => i.chave !== chave) : prev.map((i) => (i.chave === chave ? { ...i, qtd } : i))
    );
  }

  async function handleLancar() {
    setLancando(true);
    try {
      const res = await lancarRonda(
        mesa.id,
        pendentes.map((i) => ({
          productoId: i.productoId,
          opcionIds: i.opcion?.ids ?? [],
          adicionalIds: i.adicionais.map((a) => a.id),
          observacao: i.observacao,
          qtd: i.qtd,
        }))
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setPendentes([]);
      toast.success("Rodada enviada à cozinha");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao lançar os itens");
    } finally {
      setLancando(false);
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
            {mesa.personas && (
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" aria-hidden />
                {mesa.personas} {mesa.personas === 1 ? "pessoa" : "pessoas"}
              </span>
            )}
            {mesa.atendente && <span>· {mesa.atendente}</span>}
          </p>
        </div>
      </div>

      {/* Ainda não lançados */}
      {pendentes.length > 0 && (
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
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

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
          <Switch id="servico" checked={servico} onChange={handleServico} label="Cobrar serviço" />
        </div>
        <div className="mt-1 flex items-baseline justify-between border-t pt-3">
          <span className="font-heading text-lg font-semibold">Total da mesa</span>
          <span className="font-heading text-2xl font-semibold tabular-nums">{formatBRL(totalMesa)}</span>
        </div>
        {mesa.personas && mesa.personas > 1 && (
          <p className="text-right text-sm text-muted-foreground">
            {formatBRL(totalMesa / mesa.personas)} por pessoa ({mesa.personas})
          </p>
        )}
      </section>

      {/* Ações fixas */}
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
            <Button size="touch" onClick={() => setFechando(true)} disabled={pendentes.length > 0 || !temLancados}>
              Fechar conta
            </Button>
          </div>
          {pendentes.length > 0 && (
            <p className="text-center text-xs text-muted-foreground">Lance os itens pendentes antes de fechar a conta.</p>
          )}
        </div>
      </div>

      <ObservacaoSheet
        item={editandoObs}
        onClose={() => setEditandoObs(null)}
        onSalvar={(chave, obs) => {
          setPendentes((prev) => definirObservacao(prev, chave, obs));
          setEditandoObs(null);
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

function FecharContaDialog({
  open,
  onOpenChange,
  mesaId,
  titulo,
  consumo,
  servico,
  total,
  onFechada,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mesaId: string;
  titulo: string;
  consumo: number;
  servico: number;
  total: number;
  onFechada: () => void;
}) {
  const [metodoPago, setMetodoPago] = useState<MetodoPagoValue>("EFECTIVO");
  const [loading, setLoading] = useState(false);

  async function handleConfirmar() {
    setLoading(true);
    try {
      const res = await fecharConta(mesaId, { metodoPago });
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
            <div className="mt-1 flex justify-between border-t pt-2 text-lg font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatBRL(total)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Forma de pagamento</Label>
            <Select
              value={metodoPago}
              onValueChange={(v) => setMetodoPago(v as MetodoPagoValue)}
              items={METODOS_PAGO}
            >
              <SelectTrigger className="h-11 w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METODOS_PAGO.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button size="touch" onClick={handleConfirmar} disabled={loading}>
            {loading ? "Fechando..." : `Confirmar pagamento · ${formatBRL(total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
