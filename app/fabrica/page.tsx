import { prisma } from "@/lib/prisma";
import { inicioDoDiaSP } from "@/lib/format";
import { encomendaInclude, encomendaParaEvento } from "@/lib/encomendas";
import { lerConfigImpressora } from "@/lib/impressoras-db";
import { FabricaBoard } from "./fabrica-board";

export default async function FabricaPage() {
  const hoje = inicioDoDiaSP();

  const [ativas, entregues] = await Promise.all([
    prisma.encomenda.findMany({
      where: { confirmadaEm: { not: null }, estado: { in: ["RECIBIDO", "EN_PREPARACION", "LISTO"] } },
      include: encomendaInclude,
      orderBy: { retiradaEm: "asc" },
    }),
    // Retiradas hoje (lista recolhida).
    prisma.encomenda.findMany({
      where: { confirmadaEm: { not: null }, estado: "ENTREGADO", estadoDesde: { gte: hoje } },
      include: encomendaInclude,
      orderBy: { estadoDesde: "desc" },
      take: 100,
    }),
  ]);

  const impressora = await lerConfigImpressora("PRODUCAO");

  return (
    <FabricaBoard
      encomendasIniciais={ativas.map(encomendaParaEvento)}
      entreguesIniciais={entregues.map(encomendaParaEvento)}
      impressora={impressora}
    />
  );
}
