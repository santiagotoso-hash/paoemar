import { PrismaClient, TipoUnidad } from "@prisma/client";

const prisma = new PrismaClient();

// Atualização aditiva do cardápio (não apaga nada): cria os itens da lista nova que ainda
// não existem, pelo nome, e pode ser rodada de novo sem duplicar. Os novos entram com
// preço 0 e inativos — o preço se define no admin antes de liberar para venda.
// Uso: npx tsx prisma/atualizar-cardapio.ts

type Novo = { nombre: string; categoria: string; tipoUnidad?: TipoUnidad };

const NOVOS: Novo[] = [
  { nombre: "Torrada", categoria: "Pães e panificação", tipoUnidad: TipoUnidad.KG },
  { nombre: "Farinha de rosca", categoria: "Pães e panificação", tipoUnidad: TipoUnidad.KG },

  { nombre: "Folhado de frango", categoria: "Salgados assados / forno" },
  { nombre: "Bauru de Calabresa", categoria: "Salgados assados / forno" },
  { nombre: "Enroladinho queijo e presunto", categoria: "Salgados assados / forno" },
  { nombre: "Pão Pizza", categoria: "Salgados assados / forno" },

  { nombre: "Tapioca com calabresa", categoria: "Tapiocas" },
  { nombre: "Tapioca de frango c/ catupiry", categoria: "Tapiocas" },

  { nombre: "Pão com frango e salada", categoria: "Pães na chapa e sanduíches" },
  { nombre: "Pão com Atum maionese e cebolinha", categoria: "Pães na chapa e sanduíches" },

  { nombre: "Ovos com Bacon e torrada", categoria: "Café da manhã / ovos" },
  { nombre: "Banana Frita", categoria: "Café da manhã / ovos" },
  { nombre: "Vitamina de frutas (mamão, banana, maçã, melão)", categoria: "Café da manhã / ovos" },

  { nombre: "Alfajores", categoria: "Linha embalada", tipoUnidad: TipoUnidad.KG },

  { nombre: "Pizza Mussarela", categoria: "Pizzas / Forneria" },
  { nombre: "Pizza Calabresa", categoria: "Pizzas / Forneria" },
  { nombre: "Pizza Frango c/ catupiry", categoria: "Pizzas / Forneria" },
  { nombre: "Pizza Mista", categoria: "Pizzas / Forneria" },
  { nombre: "Pizza Marguerita", categoria: "Pizzas / Forneria" },

  { nombre: "Suco de Goiaba 300ml", categoria: "Sucos e vitaminas" },
  { nombre: "Suco de Goiaba 500ml", categoria: "Sucos e vitaminas" },
  { nombre: "Suco de Goiaba Jarra", categoria: "Sucos e vitaminas" },

  { nombre: "Cappuccino", categoria: "Cafeteria" },
];

// Categorias que ainda não existem no banco.
const CATEGORIAS_NOVAS: Record<string, string> = {
  "Pizzas / Forneria": "🍕",
};

async function main() {
  for (const [nombre, icono] of Object.entries(CATEGORIAS_NOVAS)) {
    const existe = await prisma.categoria.findFirst({ where: { nombre } });
    if (!existe) await prisma.categoria.create({ data: { nombre, icono } });
  }

  const categorias = await prisma.categoria.findMany();
  const idCategoria = new Map(categorias.map((c) => [c.nombre, c.id]));

  const existentes = await prisma.producto.findMany({ select: { codigo: true, nombre: true } });
  const nombres = new Set(existentes.map((p) => p.nombre.trim().toLowerCase()));
  let proximo =
    Math.max(0, ...existentes.map((p) => Number(p.codigo.replace(/\D/g, "")) || 0)) + 1;

  let criados = 0;
  for (const n of NOVOS) {
    if (nombres.has(n.nombre.trim().toLowerCase())) {
      console.log(`já existe: ${n.nombre}`);
      continue;
    }
    const categoriaId = idCategoria.get(n.categoria);
    if (!categoriaId) throw new Error(`Categoria não encontrada: ${n.categoria}`);
    await prisma.producto.create({
      data: {
        codigo: `PM-${String(proximo++).padStart(4, "0")}`,
        nombre: n.nombre,
        categoriaId,
        precio: 0,
        tipoUnidad: n.tipoUnidad ?? TipoUnidad.UNIDAD,
        stockActual: 100,
        activo: false,
      },
    });
    criados++;
  }

  // Erro de digitação do cardápio anterior.
  const corrigido = await prisma.producto.updateMany({
    where: { nombre: "Café Cuado" },
    data: { nombre: "Café Coado" },
  });

  console.log(`Cardápio atualizado: ${criados} produtos novos (inativos, preço 0), ${corrigido.count} nome corrigido.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
