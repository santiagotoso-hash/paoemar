import type { EstadoVenta } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { inicioDoDiaSP } from "@/lib/format";
import { numerosRondas, rondaCocinaInclude, rondaParaEvento } from "@/lib/rondas";
import { CocinaBoard } from "./cocina-board";

export default async function CocinaPage() {
  const pendientes = { estado: { in: ["RECIBIDO", "EN_PREPARACION", "LISTO"] as EstadoVenta[] } };
  const hoje = inicioDoDiaSP();

  const ventaInclude = { items: { include: { producto: true } } } as const;

  const [ventas, rondas, ventasEntregues, rondasEntregues] = await Promise.all([
    prisma.venta.findMany({
      where: pendientes,
      include: ventaInclude,
      orderBy: { createdAt: "asc" },
    }),
    // Rodadas lanzadas desde las mesas
    prisma.ronda.findMany({
      // Rodada que ficou vazia (todos os itens cancelados) não aparece.
      where: { ...pendientes, items: { some: {} } },
      include: rondaCocinaInclude,
      orderBy: { creadaEn: "asc" },
    }),
    // Entregues hoje (lista recolhida). Só balcão: a venda do fechamento de mesa
    // já nasce ENTREGADO e nunca passou pela cozinha.
    prisma.venta.findMany({
      where: { estado: "ENTREGADO", origen: "MOSTRADOR", updatedAt: { gte: hoje } },
      include: ventaInclude,
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.ronda.findMany({
      where: {
        estado: "ENTREGADO",
        items: { some: {} },
        // Rodadas de antes desta versão não têm entregueEm: usa o horário do último estado.
        OR: [{ entregueEm: { gte: hoje } }, { entregueEm: null, estadoDesde: { gte: hoje } }],
      },
      include: rondaCocinaInclude,
      orderBy: { estadoDesde: "desc" },
      take: 100,
    }),
  ]);

  const ventaParaEvento = (v: (typeof ventas)[number]) => ({
    id: v.id,
    codigo: v.codigo,
    nombreCliente: v.nombreCliente,
    origen: v.origen,
    estado: v.estado,
    createdAt: v.createdAt.toISOString(),
    tempos: {
      lancado: v.createdAt.toISOString(),
      entregue: v.estado === "ENTREGADO" ? v.updatedAt.toISOString() : null,
    },
    items: v.items.map((i) => ({
      productoNombre: i.producto.nombre,
      cantidad: i.cantidad.toString(),
      notas: i.notas,
    })),
  });

  const numeros = await numerosRondas([...rondas, ...rondasEntregues]);
  const paraEvento = (r: (typeof rondas)[number]) => rondaParaEvento(r, numeros.get(r.id) ?? 1);

  const ativos = [...ventas.map(ventaParaEvento), ...rondas.map(paraEvento)].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );
  // Mais recente primeiro.
  const entregues = [...ventasEntregues.map(ventaParaEvento), ...rondasEntregues.map(paraEvento)].sort((a, b) =>
    (b.tempos?.entregue ?? b.createdAt).localeCompare(a.tempos?.entregue ?? a.createdAt)
  );

  return <CocinaBoard ventasIniciales={ativos} entreguesIniciais={entregues} />;
}
