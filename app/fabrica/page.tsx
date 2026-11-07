import { prisma } from "@/lib/prisma";
import { inicioDoDiaSP } from "@/lib/format";
import { encomendaInclude, encomendaParaEvento } from "@/lib/encomendas";
import { FabricaBoard } from "./fabrica-board";

export default async function FabricaPage() {
  const hoje = inicioDoDiaSP();

  const [ativas, entregues] = await Promise.all([
    prisma.encomenda.findMany({
      where: { estado: { in: ["RECIBIDO", "EN_PREPARACION", "LISTO"] } },
      include: encomendaInclude,
      orderBy: { retiradaEm: "asc" },
    }),
    // Retiradas hoje (lista recolhida).
    prisma.encomenda.findMany({
      where: { estado: "ENTREGADO", estadoDesde: { gte: hoje } },
      include: encomendaInclude,
      orderBy: { estadoDesde: "desc" },
      take: 100,
    }),
  ]);

  return (
    <FabricaBoard
      encomendasIniciais={ativas.map(encomendaParaEvento)}
      entreguesIniciais={entregues.map(encomendaParaEvento)}
    />
  );
}
