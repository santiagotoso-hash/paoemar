import { randomInt } from "crypto";
import { PrismaClient } from "@prisma/client";
import { hashPin } from "../lib/pin";

/**
 * Dados de exemplo do atendimento nas mesas. Idempotente: não apaga nada,
 * só cria o que ainda não existe. Rodar com `npm run db:seed-mesas`.
 */
const prisma = new PrismaClient();

/** Criados com PIN aleatório (não fica no repo nem no log): o admin define o PIN em Admin → Atendentes. */
const ATENDENTES = ["Ana", "Bruno", "Carla"];

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
  for (const nombre of ATENDENTES) {
    const existe = await prisma.atendente.findFirst({ where: { nombre } });
    if (existe) continue;
    const pin = String(randomInt(0, 10_000)).padStart(4, "0");
    await prisma.atendente.create({ data: { nombre, pinHash: hashPin(pin) } });
    console.log(`Atendente criado: ${nombre} (defina o PIN em Admin → Atendentes)`);
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
