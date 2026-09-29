import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { totalItem } from "@/lib/mesas";
import { ComandaMesa, type ItemLancado, type RodadaView } from "./comanda-mesa";

export default async function ComandaMesaPage({ params }: { params: { id: string } }) {
  const comanda = await prisma.comanda.findUnique({
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
    },
  });
  if (!comanda) notFound();
  if (comanda.estado !== "ABIERTA") redirect("/mesas");

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

  const rodadas: RodadaView[] = comanda.rondas.map((r, idx) => ({
    id: r.id,
    titulo: `Rodada ${idx + 1}`,
    horario: r.creadaEn.toISOString(),
    atendente: r.atendente.nombre,
    estado: r.estado,
    itens: comanda.items.filter((i) => i.rondaId === r.id).map(item),
  }));

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

  return (
    <ComandaMesa
      mesa={{
        id: comanda.id,
        codigo: comanda.codigo,
        tipo: comanda.tipo,
        personas: comanda.personas,
        abertaEm: comanda.abiertaEn.toISOString(),
        atendente: comanda.atendente?.nombre ?? null,
        servicio: comanda.servicio,
      }}
      rodadas={rodadas}
    />
  );
}
