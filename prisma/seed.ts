import { PrismaClient, TipoUnidad } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categorias = await Promise.all(
    [
      { nombre: "Panes", icono: "🍞" },
      { nombre: "Facturas", icono: "🥐" },
      { nombre: "Tortas", icono: "🎂" },
      { nombre: "Bebidas", icono: "☕" },
    ].map((c) => prisma.categoria.create({ data: c }))
  );

  const [panes, facturas, tortas, bebidas] = categorias;

  const productos: {
    codigo: string;
    nombre: string;
    categoriaId: string;
    precio: number;
    tipoUnidad?: TipoUnidad;
    stockActual: number;
    stockMinimo?: number;
  }[] = [
    { codigo: "PAN-001", nombre: "Baguette", categoriaId: panes.id, precio: 1800, stockActual: 20, stockMinimo: 5 },
    { codigo: "PAN-002", nombre: "Pan de campo", categoriaId: panes.id, precio: 2200, tipoUnidad: TipoUnidad.KG, stockActual: 8, stockMinimo: 3 },
    { codigo: "PAN-003", nombre: "Pan lactal", categoriaId: panes.id, precio: 3200, stockActual: 15, stockMinimo: 5 },
    { codigo: "PAN-004", nombre: "Pan integral", categoriaId: panes.id, precio: 2800, tipoUnidad: TipoUnidad.KG, stockActual: 2, stockMinimo: 3 },
    { codigo: "FAC-001", nombre: "Medialuna de manteca", categoriaId: facturas.id, precio: 600, stockActual: 60, stockMinimo: 15 },
    { codigo: "FAC-002", nombre: "Medialuna de grasa", categoriaId: facturas.id, precio: 550, stockActual: 50, stockMinimo: 15 },
    { codigo: "FAC-003", nombre: "Vigilante", categoriaId: facturas.id, precio: 900, stockActual: 30, stockMinimo: 10 },
    { codigo: "FAC-004", nombre: "Sacramento", categoriaId: facturas.id, precio: 950, stockActual: 4, stockMinimo: 10 },
    { codigo: "FAC-005", nombre: "Bola de fraile", categoriaId: facturas.id, precio: 800, stockActual: 25, stockMinimo: 10 },
    { codigo: "TOR-001", nombre: "Torta de chocolate (porción)", categoriaId: tortas.id, precio: 2500, stockActual: 12, stockMinimo: 4 },
    { codigo: "TOR-002", nombre: "Torta de frutilla (porción)", categoriaId: tortas.id, precio: 2700, stockActual: 10, stockMinimo: 4 },
    { codigo: "TOR-003", nombre: "Cheesecake (porción)", categoriaId: tortas.id, precio: 2900, stockActual: 8, stockMinimo: 4 },
    { codigo: "TOR-004", nombre: "Torta entera de cumpleaños", categoriaId: tortas.id, precio: 18000, stockActual: 3, stockMinimo: 2 },
    { codigo: "BEB-001", nombre: "Café con leche", categoriaId: bebidas.id, precio: 1500, stockActual: 100, stockMinimo: 20 },
    { codigo: "BEB-002", nombre: "Capuchino", categoriaId: bebidas.id, precio: 1700, stockActual: 100, stockMinimo: 20 },
    { codigo: "BEB-003", nombre: "Té", categoriaId: bebidas.id, precio: 1200, stockActual: 100, stockMinimo: 20 },
    { codigo: "BEB-004", nombre: "Jugo de naranja natural", categoriaId: bebidas.id, precio: 1900, stockActual: 30, stockMinimo: 10 },
    { codigo: "BEB-005", nombre: "Agua mineral", categoriaId: bebidas.id, precio: 1000, stockActual: 40, stockMinimo: 10 },
  ];

  await prisma.producto.createMany({ data: productos });

  console.log(`Seed OK: ${categorias.length} categorías, ${productos.length} productos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
