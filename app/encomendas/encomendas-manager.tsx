"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Minus, Phone, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { EncomendaEvent } from "@/lib/realtime";
import { formatHora } from "@/lib/format";
import { cn } from "@/lib/utils";
import { cancelarEncomenda, criarEncomenda } from "./actions";

type Produto = { id: string; nombre: string; categoria: string; kg: boolean };
type Cliente = { id: string; nombre: string; telefone: string | null };

const ESTADO_LABEL: Record<EncomendaEvent["estado"], string> = {
  RECIBIDO: "Aguardando a Fábrica",
  EN_PREPARACION: "Em produção",
  LISTO: "Pronta para retirar",
  ENTREGADO: "Retirada",
};

const FUSO = "America/Sao_Paulo";
const diaChave = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO });
const diaCurto = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: FUSO });

/** "Hoje 14:30", "Amanhã 08:00", "sex., 13/11 09:00" */
function rotuloRetirada(iso: string) {
  const agora = Date.now();
  const dia = diaChave.format(new Date(iso));
  const quando =
    dia === diaChave.format(new Date(agora))
      ? "Hoje"
      : dia === diaChave.format(new Date(agora + 24 * 60 * 60 * 1000))
        ? "Amanhã"
        : diaCurto.format(new Date(iso));
  return `${quando} ${formatHora(iso)}`;
}

/** "2026-11-10T08:30" no horário de Brasília para o `min` do campo de data. */
function agoraLocalSP() {
  const d = new Date();
  const dia = diaChave.format(d);
  const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: FUSO }).format(d);
  return `${dia}T${hora}`;
}

function NovaEncomendaForm({
  produtos,
  clientes,
  onDone,
  onSujo,
}: {
  produtos: Produto[];
  clientes: Cliente[];
  onDone: () => void;
  /** Avisa se o formulário já tem algo preenchido (para confirmar antes de fechar). */
  onSujo: (sujo: boolean) => void;
}) {
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [retiradaEm, setRetiradaEm] = useState("");
  const [notas, setNotas] = useState("");
  const [busca, setBusca] = useState("");
  const [qtds, setQtds] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  // Nome igual ao de um cliente cadastrado = cliente escolhido; qualquer outro nome vale como digitado.
  const clienteEscolhido = useMemo(
    () => clientes.find((c) => c.nombre.toLowerCase() === nombreCliente.trim().toLowerCase()),
    [clientes, nombreCliente]
  );

  // O telefone acompanha o cliente escolhido, a não ser que tenha sido digitado à mão.
  const [telefoneManual, setTelefoneManual] = useState(false);

  function handleCliente(valor: string) {
    setNombreCliente(valor);
    if (telefoneManual) return;
    const c = clientes.find((x) => x.nombre.toLowerCase() === valor.trim().toLowerCase());
    setTelefone(c?.telefone ?? "");
  }

  const sujo = !!(nombreCliente.trim() || telefone.trim() || retiradaEm || notas.trim() || Object.keys(qtds).length);
  useEffect(() => {
    onSujo(sujo);
  }, [sujo, onSujo]);

  const porId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);
  const escolhidos = Object.entries(qtds).filter(([, q]) => q > 0);
  const resultados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos.filter((p) => !termo || p.nombre.toLowerCase().includes(termo));
  }, [produtos, busca]);

  function ajustar(p: Produto, delta: number) {
    const passo = p.kg ? 0.5 : 1;
    setQtds((atual) => {
      const novo = Math.max(0, Math.round(((atual[p.id] ?? 0) + delta * passo) * 100) / 100);
      const proximo = { ...atual, [p.id]: novo };
      if (novo === 0) delete proximo[p.id];
      return proximo;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await criarEncomenda({
        nombreCliente,
        clienteId: clienteEscolhido?.id,
        telefone,
        retiradaEm,
        notas,
        items: escolhidos.map(([productoId, cantidad]) => ({ productoId, cantidad })),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Encomenda ${res.codigo} enviada para a Fábrica`);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar a encomenda");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto pr-1">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cliente">Cliente</Label>
          <Input
            id="cliente"
            list="clientes-lista"
            autoComplete="off"
            placeholder="Digite ou escolha da lista"
            value={nombreCliente}
            onChange={(e) => handleCliente(e.target.value)}
            required
          />
          <datalist id="clientes-lista">
            {clientes.map((c) => (
              <option key={c.id} value={c.nombre} />
            ))}
          </datalist>
          {clienteEscolhido && <span className="text-xs text-primary">Cliente cadastrado</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="telefone">Telefone (opcional)</Label>
          <Input
            id="telefone"
            inputMode="tel"
            value={telefone}
            onChange={(e) => {
              setTelefone(e.target.value);
              // Apagar o campo devolve o preenchimento automático.
              setTelefoneManual(e.target.value !== "");
            }}
            placeholder="(71) 99999-9999"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="retirada">Retirada (data e hora)</Label>
        <Input
          id="retirada"
          type="datetime-local"
          min={agoraLocalSP()}
          value={retiradaEm}
          onChange={(e) => setRetiradaEm(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="busca">Itens</Label>
        {escolhidos.length > 0 && (
          <ul className="flex flex-col divide-y rounded-xl border bg-accent/40">
            {escolhidos.map(([id, q]) => {
              const p = porId.get(id)!;
              return (
                <li key={id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.nombre}</span>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="outline" size="icon" aria-label={`Menos ${p.nombre}`} onClick={() => ajustar(p, -1)}>
                      <Minus />
                    </Button>
                    <span className="w-14 text-center text-sm tabular-nums">
                      {q.toString().replace(".", ",")}
                      {p.kg ? " kg" : ""}
                    </span>
                    <Button type="button" variant="outline" size="icon" aria-label={`Mais ${p.nombre}`} onClick={() => ajustar(p, 1)}>
                      <Plus />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Input id="busca" placeholder="Buscar pão, croissant, bolo…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <ul className="max-h-48 overflow-y-auto rounded-xl border">
          {resultados.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Nenhum produto encontrado.</li>}
          {resultados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => ajustar(p, 1)}
                className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm hover:bg-muted"
              >
                <span className="truncate">{p.nombre}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {p.categoria}
                  {p.kg ? " · kg" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {produtos.length === 0 && (
          <p className="text-xs text-destructive">
            Nenhum produto está marcado como encomendável. Marque em Admin → Produtos.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notas">Observações para a Fábrica (opcional)</Label>
        <Textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading || escolhidos.length === 0}>
          {loading ? "Enviando..." : "Enviar para a Fábrica"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EncomendasManager({
  encomendas,
  produtos,
  clientes,
}: {
  encomendas: EncomendaEvent[];
  produtos: Produto[];
  clientes: Cliente[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [formSujo, setFormSujo] = useState(false);

  // Fechar (X, Esc ou clique fora) com dados preenchidos pede confirmação.
  function handleAbrirFechar(abrir: boolean) {
    if (!abrir && formSujo && !window.confirm("Sair da encomenda? Os dados preenchidos serão perdidos.")) return;
    setAberto(abrir);
  }
  const [cancelando, setCancelando] = useState<string | null>(null);

  // O andamento muda na Fábrica: recarrega a lista de tempos em tempos.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(t);
  }, [router]);

  async function handleCancelar(e: EncomendaEvent) {
    if (!window.confirm(`Cancelar a encomenda ${e.codigo} de ${e.nombreCliente}?`)) return;
    setCancelando(e.id);
    try {
      const res = await cancelarEncomenda(e.id);
      if (!res.ok) toast.error(res.error);
      else toast.success("Encomenda cancelada");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cancelar");
    } finally {
      setCancelando(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Encomendas</h1>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/encomendas/clientes" />}>
            <Users />
            Clientes
          </Button>
          <Dialog open={aberto} onOpenChange={handleAbrirFechar}>
            <DialogTrigger render={<Button />}>
              <Plus />
              Nova encomenda
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova encomenda</DialogTitle>
              </DialogHeader>
              <NovaEncomendaForm
                produtos={produtos}
                clientes={clientes}
                onSujo={setFormSujo}
                onDone={() => {
                  setAberto(false);
                  router.refresh();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {encomendas.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma encomenda em aberto.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {encomendas.map((e) => (
            <li key={e.id} className={cn("flex flex-col gap-2 rounded-2xl border bg-card p-4", e.estado === "ENTREGADO" && "opacity-60")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {e.codigo} · {e.nombreCliente}
                </p>
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-primary">
                  {ESTADO_LABEL[e.estado]}
                </span>
              </div>
              <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="size-4" aria-hidden />
                  Retirada {rotuloRetirada(e.retiradaEm)}
                </span>
                {e.telefone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3.5" aria-hidden />
                    {e.telefone}
                  </span>
                )}
              </p>
              <ul className="text-sm">
                {e.items.map((i, idx) => (
                  <li key={idx}>
                    {i.cantidad}x {i.productoNombre}
                  </li>
                ))}
              </ul>
              {e.notas && <p className="text-sm text-muted-foreground">Obs.: {e.notas}</p>}
              {e.estado === "RECIBIDO" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  disabled={cancelando === e.id}
                  onClick={() => handleCancelar(e)}
                >
                  <Trash2 />
                  {cancelando === e.id ? "Cancelando..." : "Cancelar encomenda"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
