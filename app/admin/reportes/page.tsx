import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const METODO_PAGO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA_CREDITO: "Tarjeta de crédito",
  TARJETA_DEBITO: "Tarjeta de débito",
  TRANSFERENCIA: "Transferencia",
};

export default async function ReportesPage() {
  const [agregado, porMetodoPago, topItems] = await Promise.all([
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
            <CardTitle>Ticket promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">${ticketPromedio.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">{cantidadVentas} venta(s) en total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ventas por método de pago</CardTitle>
          </CardHeader>
          <CardContent>
            {porMetodoPago.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no hay ventas.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {porMetodoPago.map((m) => (
                  <li key={m.metodoPago} className="flex justify-between">
                    <span>{METODO_PAGO_LABEL[m.metodoPago] ?? m.metodoPago}</span>
                    <span className="font-medium">
                      ${Number(m._sum.total ?? 0).toFixed(2)} ({m._count._all})
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
          <CardTitle>Top 5 productos más vendidos</CardTitle>
        </CardHeader>
        <CardContent>
          {topItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay ventas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad vendida</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topItems.map((t) => (
                  <TableRow key={t.productoId}>
                    <TableCell>{nombreProducto(t.productoId)}</TableCell>
                    <TableCell>{t._sum.cantidad?.toString()}</TableCell>
                    <TableCell className="text-right">${Number(t._sum.total ?? 0).toFixed(2)}</TableCell>
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
