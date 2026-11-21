import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAtendenteActual, podeModificarMesa } from "@/lib/atendente";
import { totalItem } from "@/lib/mesas";
import { ComandaMesa, type CancelamentoView, type ItemLancado, type RodadaView } from "./comanda-mesa";

export default async function ComandaMesaPage({ params }: { params: { id: string } }) {
  const [comanda, supervisores, atendente] = await Promise.all([
    prisma.comanda.findUnique({
      where: { id: params.id },
      include: {
        atendente: { select: { nombre: true } },
        rondas: {
          orderBy: { creadaEn: "asc" },
          include: { atendente: { select: { nombre: true } } },
        },
        items: {
          orderBy: { id: "asc" },
          include: {
            producto: { select: { nombre: true } },
            adicionais: { select: { nombre: true, precio: true } },
          },
        },
        cancelamentos: {
          orderBy: { criadoEm: "asc" },
          include: { supervisor: { select: { nombre: true } } },
        },
      },
    }),
    prisma.atendente.findMany({
      where: { activo: true, supervisor: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    getAtendenteActual(),
  ]);
  if (!comanda) notFound();
  // ?fechada= avisa o bloqueio de saída que os pendentes desta mesa não têm mais destino.
  if (comanda.estado !== "ABIERTA") redirect(`/mesas?fechada=${comanda.id}`);
  // Mesa de outro atendente: só visualização (o servidor também barra nas actions).
  const somenteLeitura = !atendente || !podeModificarMesa(atendente, comanda.atendenteId);

  type ItemDb = NonNullable<typeof comanda>["items"][number];
  function item(i: ItemDb): ItemLancado {
    return {
      id: i.id,
      nombre: i.producto.nombre,
      qtd: Number(i.cantidad),
      opcion: i.opcion,
      adicionais: i.adicionais.map((a) => a.nombre),
      observacao: i.notas,
      total: totalItem(i),
    };
  }

  const rodadas: RodadaView[] = comanda.rondas
    .map((r, idx) => ({
      id: r.id,
      titulo: `Rodada ${idx + 1}`,
      horario: r.creadaEn.toISOString(),
      atendente: r.atendente.nombre,
      estado: r.estado,
      itens: comanda.items.filter((i) => i.rondaId === r.id).map(item),
    }))
    // Rodada com todos os itens cancelados some (o registro fica em "Cancelados").
    .filter((r) => r.itens.length > 0);

  // Itens lançados pela tela antiga de comandas (sem rodada).
  const semRodada = comanda.items.filter((i) => !i.rondaId);
  if (semRodada.length > 0) {
    rodadas.unshift({
      id: "sem-rodada",
      titulo: "Lançados antes",
      horario: null,
      atendente: null,
      estado: null,
      itens: semRodada.map(item),
    });
  }

  const cancelamentos: CancelamentoView[] = comanda.cancelamentos.map((c) => ({
    id: c.id,
    nombre: c.productoNombre,
    detalhe: c.detalhe,
    qtd: Number(c.cantidad),
    valor: Number(c.valor),
    motivo: c.motivo,
    supervisor: c.supervisor.nombre,
    horario: c.criadoEm.toISOString(),
  }));

  return (
    <ComandaMesa
      mesa={{
        id: comanda.id,
        codigo: comanda.codigo,
        tipo: comanda.tipo,
        personas: comanda.personas,
        abertaEm: comanda.abiertaEn.toISOString(),
        atendente: comanda.atendente?.nombre ?? null,
      }}
      rodadas={rodadas}
      supervisores={supervisores}
      cancelamentos={cancelamentos}
      somenteLeitura={somenteLeitura}
    />
  );
}
