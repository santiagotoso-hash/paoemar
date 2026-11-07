import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Clientes de exemplo para as encomendas. Todos os dados (CNPJ, telefone, e-mail, endereço)
// são FICTÍCIOS. Idempotente: pula o cliente que já existe pelo nome.
// Uso: npx tsx prisma/seed-clientes.ts

const CLIENTES = [
  {
    nombre: "Pousada do Forte",
    endereco: "Rua da Aldeia, 120 — Praia do Forte, Mata de São João/BA",
    telefone: "(71) 99100-0001",
    email: "reservas@pousadadoforte.example.com",
    cnpj: "11.111.111/0001-11",
    notas: "Dados fictícios. Pão e croissant para o café da manhã dos hóspedes, entrega às 6h30.",
  },
  {
    nombre: "Mercado Oliveira",
    endereco: "Av. do Farol, 45 — Praia do Forte, Mata de São João/BA",
    telefone: "(71) 99100-0002",
    email: "compras@mercadooliveira.example.com",
    cnpj: "22.222.222/0001-22",
    notas: "Dados fictícios. Pedido semanal de pães de sal e de forma; retira na fábrica.",
  },
  {
    nombre: "Mercado HiperIdeal Praia do Forte",
    endereco: "Rodovia BA-099, km 56 — Praia do Forte, Mata de São João/BA",
    telefone: "(71) 99100-0003",
    email: "padaria@hiperideal.example.com",
    cnpj: "33.333.333/0001-33",
    notas: "Dados fictícios. Volume grande; confirmar quantidades com 48h de antecedência.",
  },
  {
    nombre: "Pousada Algas Marinhas",
    endereco: "Travessa das Algas, 8 — Praia do Forte, Mata de São João/BA",
    telefone: "(71) 99100-0004",
    email: "contato@algasmarinhas.example.com",
    cnpj: "44.444.444/0001-44",
    notas: "Dados fictícios. Bolos e pães para o café; pagamento quinzenal.",
  },
  {
    nombre: "Pão e Mar",
    endereco: "Av. do Farol, 200 — Praia do Forte, Mata de São João/BA",
    telefone: "(71) 99100-0006",
    email: "contato@paoemar.example.com",
    cnpj: "66.666.666/0001-66",
    notas: "Dados fictícios. Encomenda interna: produção da fábrica para abastecer o balcão da loja.",
  },
  {
    nombre: "Pousada Sobrado da Vila",
    endereco: "Rua do Sobrado, 30 — Vila de Praia do Forte, Mata de São João/BA",
    telefone: "(71) 99100-0005",
    email: "sobrado@sobradodavila.example.com",
    cnpj: "55.555.555/0001-55",
    notas: "Dados fictícios. Prefere pães integrais e croissants amanteigados.",
  },
];

async function main() {
  let criados = 0;
  for (const c of CLIENTES) {
    const existe = await prisma.cliente.findFirst({ where: { nombre: c.nombre } });
    if (existe) {
      console.log(`já existe: ${c.nombre}`);
      continue;
    }
    await prisma.cliente.create({ data: c });
    criados++;
  }
  console.log(`Clientes: ${criados} criados.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
