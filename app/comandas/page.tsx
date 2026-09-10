import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { NuevaComandaDialog } from "./nueva-comanda-dialog";

export default async function ComandasPage() {
  const comandas = await prisma.comanda.findMany({
    where: { estado: "ABIERTA" },
    include: { items: true },
    orderBy: { abiertaEn: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Comandas abiertas</h1>
        <NuevaComandaDialog />
      </div>

      {comandas.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay comandas abiertas.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {comandas.map((c) => {
            const total = c.items.reduce((acc, i) => acc + Number(i.precioUnit) * Number(i.cantidad), 0);
            return (
              <Link key={c.id} href={`/comandas/${c.id}`}>
                <Card className="transition-colors hover:bg-muted">
                  <CardContent className="flex flex-col gap-1 p-4">
                    <span className="font-medium">{c.codigo}</span>
                    {c.nombreCliente && (
                      <span className="text-sm text-muted-foreground">{c.nombreCliente}</span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {c.items.length} ítem(s) — ${total.toFixed(2)}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
