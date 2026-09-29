import { PrismaClient } from "@prisma/client";
import { hashPin } from "../lib/atendente";

/**
 * Dados de exemplo do atendimento nas mesas. Idempotente: não apaga nada,
 * só cria o que ainda não existe. Rodar com `npm run db:seed-mesas`.
 */
const prisma = new PrismaClient();

const ATENDENTES = [
  { nombre: "Ana", pin: "1234" },
  { nombre: "Bruno", pin: "2345" },
  { nombre: "Carla", pin: "3456" },
];

/** Grupos de escolha única para os produtos do cardápio que têm "ou" no nome. */
const GRUPOS: { producto: string; grupo: string; opciones: { nombre: string; precio?: number }[] }[] = [
  {
    producto: "Tapioca com Mussarela ou Queijo coalho",
    grupo: "Recheio",
    opciones: [{ nombre: "Mussarela" }, { nombre: "Queijo coalho" }],
  },
  {
    producto: "Tapioca de banana ou morango c/ nutella",
    grupo: "Fruta",
    opciones: [{ nombre: "Banana" }, { nombre: "Morango" }],
  },
  {
    producto: "Omelete Carne, frango ou vegetariano",
    grupo: "Recheio",
    opciones: [{ nombre: "Carne" }, { nombre: "Frango" }, { nombre: "Vegetariano" }],
  },
  {
    producto: "Chocolate quente ou frio",
    grupo: "Temperatura",
    opciones: [{ nombre: "Quente" }, { nombre: "Frio" }],
  },
];

async function main() {
  for (const a of ATENDENTES) {
    const existe = await prisma.atendente.findFirst({ where: { nombre: a.nombre } });
    if (existe) continue;
    await prisma.atendente.create({ data: { nombre: a.nombre, pinHash: hashPin(a.pin) } });
    console.log(`Atendente criado: ${a.nombre} (PIN ${a.pin})`);
  }

  for (const g of GRUPOS) {
    const producto = await prisma.producto.findFirst({
      where: { nombre: g.producto },
      include: { gruposOpcion: { select: { id: true } } },
    });
    if (!producto || producto.gruposOpcion.length > 0) continue;
    await prisma.grupoOpcion.create({
      data: {
        nombre: g.grupo,
        productoId: producto.id,
        opciones: { create: g.opciones.map((o, orden) => ({ nombre: o.nombre, precio: o.precio ?? 0, orden })) },
      },
    });
    console.log(`Grupo "${g.grupo}" criado em: ${g.producto}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
