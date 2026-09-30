import { prisma } from "@/lib/prisma";
import { getAtendenteActual, podeModificarMesa } from "@/lib/atendente";
import { chaveMesa, MESAS_DA_CASA, totalItem } from "@/lib/mesas";
import { ChipAtendente } from "../chip-atendente";
import { MesasGrid, type MesaCard } from "./mesas-grid";

export default async function MesasPage() {
  const [atendente, abertas] = await Promise.all([
    getAtendenteActual(),
    prisma.comanda.findMany({
      where: { estado: "ABIERTA" },
      select: {
        id: true,
        codigo: true,
        tipo: true,
        abiertaEn: true,
        atendenteId: true,
        atendente: { select: { nombre: true } },
        items: {
          select: {
            cantidad: true,
            precioUnit: true,
            adicionais: { select: { precio: true } },
            producto: { select: { tipoUnidad: true } },
          },
        },
      },
    }),
  ]);

  const porChave = new Map(abertas.map((c) => [chaveMesa(c.codigo), c]));

  function ocupada(c: (typeof abertas)[number]): MesaCard {
    return {
      tipo: c.tipo,
      rotulo: c.codigo,
      comandaId: c.id,
      dono: c.atendente?.nombre ?? null,
      minha: podeModificarMesa(atendente!, c.atendenteId),
      abertaEm: c.abiertaEn.toISOString(),
      total: c.items.reduce((acc, i) => acc + totalItem(i), 0),
      // Produto por kg conta como 1 item.
      qtdItens: c.items.reduce(
        (acc, i) => acc + (i.producto.tipoUnidad === "KG" ? 1 : Number(i.cantidad)),
        0
      ),
    };
  }

  const daCasa: MesaCard[] = MESAS_DA_CASA.map((m) => {
    const c = porChave.get(chaveMesa(m.rotulo));
    return c ? ocupada(c) : { ...m, comandaId: null };
  });
  const chavesDaCasa = new Set(MESAS_DA_CASA.map((m) => chaveMesa(m.rotulo)));
  const avulsas = abertas.filter((c) => !chavesDaCasa.has(chaveMesa(c.codigo))).map(ocupada);

  // Números em ordem numérica primeiro, depois nomes em ordem alfabética.
  const mesas = [...daCasa, ...avulsas].sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === "NUMERO" ? -1 : 1;
    return a.rotulo.localeCompare(b.rotulo, "pt-BR", { numeric: true });
  });

  return (
    <div className="flex flex-col gap-5 pb-24">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Mesas</h1>
        <ChipAtendente atendente={atendente!} />
      </div>
      <MesasGrid mesas={mesas} />
    </div>
  );
}
