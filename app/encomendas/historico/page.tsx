import Link from "next/link";
import { ArrowLeft, CalendarClock, Phone, Search } from "lucide-react";
import type { EstadoVenta, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDataHora } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Sem filtro, mostra só as mais recentes para a página não ficar enorme. */
const LIMITE = 100;

const ESTADO_LABEL: Record<EstadoVenta, string> = {
  RECIBIDO: "Aguardando a Fábrica",
  EN_PREPARACION: "Em produção",
  LISTO: "Pronta para retirar",
  ENTREGADO: "Retirada",
};

/** "2026-11-10" -> [início do dia, início do dia seguinte] no horário de Brasília (-03:00). */
function limitesDoDia(dia: string) {
  const inicio = new Date(`${dia}T00:00:00-03:00`);
  if (Number.isNaN(inicio.getTime())) return null;
  return { inicio, fim: new Date(inicio.getTime() + 24 * 60 * 60 * 1000) };
}

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: { dia?: string; cliente?: string; clienteId?: string };
}) {
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.dia ?? "") ? searchParams.dia! : "";
  const cliente = (searchParams.cliente ?? "").trim().slice(0, 100);
  const limites = dia ? limitesDoDia(dia) : null;

  // Vindo da tela de clientes: filtra pelo cadastro (pega também encomendas de quando o nome era outro).
  const clienteCadastrado = searchParams.clienteId
    ? await prisma.cliente.findUnique({ where: { id: searchParams.clienteId }, select: { id: true, nombre: true } })
    : null;

  // Histórico = o que foi para a produção (confirmada), em qualquer andamento.
  const where: Prisma.EncomendaWhereInput = {
    confirmadaEm: { not: null },
    ...(clienteCadastrado ? { clienteId: clienteCadastrado.id } : {}),
    ...(limites ? { retiradaEm: { gte: limites.inicio, lt: limites.fim } } : {}),
    ...(cliente ? { nombreCliente: { contains: cliente, mode: "insensitive" } } : {}),
  };

  const [encomendas, clientes] = await Promise.all([
    prisma.encomenda.findMany({
      where,
      orderBy: { retiradaEm: "desc" },
      take: LIMITE,
      include: { items: { orderBy: { id: "asc" }, include: { producto: { select: { nombre: true } } } } },
    }),
    prisma.cliente.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ]);

  const filtrando = !!(dia || cliente || clienteCadastrado);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={clienteCadastrado ? "/encomendas/clientes" : "/encomendas"}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {clienteCadastrado ? "Voltar aos clientes" : "Voltar às encomendas"}
      </Link>

      <h1 className="text-xl font-semibold">
        {clienteCadastrado ? `Histórico de ${clienteCadastrado.nombre}` : "Histórico de encomendas"}
      </h1>
      <p className="-mt-2 text-sm text-muted-foreground">As encomendas que foram confirmadas e enviadas para a produção.</p>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4">
        {/* Mantém o cliente do cadastro ao filtrar por dia. */}
        {clienteCadastrado && <input type="hidden" name="clienteId" value={clienteCadastrado.id} />}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dia">Dia da entrega</Label>
          <Input id="dia" name="dia" type="date" defaultValue={dia} />
        </div>
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <Label htmlFor="cliente">Cliente</Label>
          <Input
            id="cliente"
            name="cliente"
            list="clientes-historico"
            autoComplete="off"
            placeholder="Digite ou escolha da lista"
            defaultValue={cliente}
          />
          <datalist id="clientes-historico">
            {clientes.map((c) => (
              <option key={c.id} value={c.nombre} />
            ))}
          </datalist>
        </div>
        <div className="flex gap-2">
          <Button type="submit">
            <Search />
            Filtrar
          </Button>
          {filtrando && (
            <Button variant="outline" nativeButton={false} render={<Link href="/encomendas/historico" />}>
              Limpar
            </Button>
          )}
        </div>
      </form>

      <p className="text-sm text-muted-foreground" role="status">
        {encomendas.length === 0
          ? "Nenhuma encomenda encontrada."
          : encomendas.length === LIMITE
            ? `Mostrando as ${LIMITE} mais recentes. Use os filtros para refinar.`
            : `${encomendas.length} ${encomendas.length === 1 ? "encomenda" : "encomendas"}`}
      </p>

      <ul className="flex flex-col gap-3">
        {encomendas.map((e) => {
          const etapas = [
            ["Enviada", e.confirmadaEm],
            ["Produção", e.emProducaoEm],
            ["Pronta", e.prontoEm],
            ["Retirada", e.entregueEm],
          ].filter((etapa): etapa is [string, Date] => etapa[1] !== null);

          return (
            <li key={e.id} className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <p className="font-semibold">
                  {e.codigo} · {e.nombreCliente}
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                  <CalendarClock className="size-4 text-primary" aria-hidden />
                  Entrega {formatDataHora(e.retiradaEm.toISOString())}
                </span>
              </div>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-primary">
                  {ESTADO_LABEL[e.estado]}
                </span>
                {e.telefone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3.5" aria-hidden />
                    {e.telefone}
                  </span>
                )}
              </p>
              <ul className="text-sm">
                {e.items.map((i) => (
                  <li key={i.id}>
                    {i.cantidad.toString().replace(".", ",")}x {i.producto.nombre}
                  </li>
                ))}
              </ul>
              {e.notas && <p className="text-sm text-muted-foreground">Obs.: {e.notas}</p>}
              <p className="text-xs text-muted-foreground">
                {etapas.map(([nome, quando], idx) => (
                  <span key={nome}>
                    {idx > 0 && " · "}
                    {nome} {formatDataHora(quando.toISOString())}
                  </span>
                ))}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
