import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/format";
import { BANDEIRA_LABEL, METODO_PAGO_LABEL } from "@/lib/metodos-pago";

export default async function ReportesPage() {
  const [agregado, porMetodoPago, topItems, porBandeira] = await Promise.all([
    prisma.venta.aggregate({ _avg: { total: true }, _count: { _all: true } }),
    prisma.venta.groupBy({
      by: ["metodoPago"],
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.ventaItem.groupBy({
      by: ["productoId"],
      _sum: { cantidad: true, total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
    // Para conferir com a maquininha: crédito/débito separados por bandeira.
    prisma.venta.groupBy({
      by: ["metodoPago", "bandeira"],
      where: { metodoPago: { in: ["TARJETA_CREDITO", "TARJETA_DEBITO"] } },
      _sum: { total: true },
      _count: { _all: true },
      orderBy: [{ metodoPago: "asc" }, { bandeira: "asc" }],
    }),
  ]);

  const productos = await prisma.producto.findMany({
    where: { id: { in: topItems.map((t) => t.productoId) } },
    select: { id: true, nombre: true },
  });
  const nombreProducto = (id: string) => productos.find((p) => p.id === id)?.nombre ?? "—";

  const ticketPromedio = agregado._avg.total ? Number(agregado._avg.total) : 0;
  const cantidadVentas = agregado._count._all;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ticket médio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatBRL(ticketPromedio)}</p>
            <p className="text-sm text-muted-foreground">{cantidadVentas} venda(s) no total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendas por forma de pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            {porMetodoPago.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não há vendas.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {porMetodoPago.map((m) => (
                  <li key={m.metodoPago} className="flex justify-between">
                    <span>{METODO_PAGO_LABEL[m.metodoPago] ?? m.metodoPago}</span>
                    <span className="font-medium">
                      {formatBRL(Number(m._sum.total ?? 0))} ({m._count._all})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cartões por bandeira</CardTitle>
        </CardHeader>
        <CardContent>
          {porBandeira.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há vendas no cartão.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {porBandeira.map((b) => (
                <li key={`${b.metodoPago}-${b.bandeira}`} className="flex justify-between">
                  <span>
                    {METODO_PAGO_LABEL[b.metodoPago] ?? b.metodoPago} ·{" "}
                    {b.bandeira ? BANDEIRA_LABEL[b.bandeira] : "Sem bandeira (vendas antigas)"}
                  </span>
                  <span className="font-medium">
                    {formatBRL(Number(b._sum.total ?? 0))} ({b._count._all})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 produtos mais vendidos</CardTitle>
        </CardHeader>
        <CardContent>
          {topItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há vendas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade vendida</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topItems.map((t) => (
                  <TableRow key={t.productoId}>
                    <TableCell>{nombreProducto(t.productoId)}</TableCell>
                    <TableCell>{t._sum.cantidad?.toString()}</TableCell>
                    <TableCell className="text-right">{formatBRL(Number(t._sum.total ?? 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
