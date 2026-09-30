import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { nomeMesa } from "@/lib/mesas";

const PERIODOS = [7, 30, 90];

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** Registro de itens cancelados nas mesas (quem autorizou, quem pediu e por quê). */
export default async function CancelamentosPage({ searchParams }: { searchParams: { dias?: string } }) {
  const dias = PERIODOS.includes(Number(searchParams.dias)) ? Number(searchParams.dias) : 30;
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

  const cancelamentos = await prisma.cancelamentoItem.findMany({
    where: { criadoEm: { gte: desde } },
    orderBy: { criadoEm: "desc" },
    include: {
      comanda: { select: { codigo: true, tipo: true } },
      supervisor: { select: { nombre: true } },
      atendente: { select: { nombre: true } },
    },
  });

  const valorTotal = cancelamentos.reduce((acc, c) => acc + Number(c.valor), 0);
  const porMotivo = new Map<string, { qtd: number; valor: number }>();
  for (const c of cancelamentos) {
    const m = porMotivo.get(c.motivo) ?? { qtd: 0, valor: 0 };
    porMotivo.set(c.motivo, { qtd: m.qtd + 1, valor: m.valor + Number(c.valor) });
  }
  const motivos = Array.from(porMotivo.entries()).sort((a, b) => b[1].valor - a[1].valor);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Itens cancelados</h2>
        <nav className="flex gap-1" aria-label="Período">
          {PERIODOS.map((p) => (
            <Link
              key={p}
              href={`/admin/cancelamentos?dias=${p}`}
              aria-current={p === dias ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                p === dias ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {p} dias
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Cancelamentos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{cancelamentos.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Valor cancelado</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatBRL(valorTotal)}</CardContent>
        </Card>
      </div>

      {motivos.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">Por motivo</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Vezes</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {motivos.map(([motivo, m]) => (
                <TableRow key={motivo}>
                  <TableCell>{motivo}</TableCell>
                  <TableCell className="text-right">{m.qtd}</TableCell>
                  <TableCell className="text-right">{formatBRL(m.valor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold">Detalhe</h3>
        {cancelamentos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum cancelamento nos últimos {dias} dias.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Mesa</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Autorizou</TableHead>
                <TableHead>Atendente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cancelamentos.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap">{dataHora.format(c.criadoEm)}</TableCell>
                  <TableCell className="whitespace-nowrap">{nomeMesa(c.comanda.tipo, c.comanda.codigo)}</TableCell>
                  <TableCell>
                    {c.productoNombre}
                    {c.detalhe && <span className="block text-xs text-muted-foreground">{c.detalhe}</span>}
                  </TableCell>
                  <TableCell className="text-right">{Number(c.cantidad)}</TableCell>
                  <TableCell className="text-right">{formatBRL(Number(c.valor))}</TableCell>
                  <TableCell className="max-w-64 whitespace-normal">{c.motivo}</TableCell>
                  <TableCell>{c.supervisor.nombre}</TableCell>
                  <TableCell>{c.atendente.nombre}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
