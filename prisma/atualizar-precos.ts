import { PrismaClient, TipoUnidad } from "@prisma/client";

const prisma = new PrismaClient();

// Atualiza preço e unidade (kg/un) dos produtos a partir da planilha de preços sugeridos.
// Casa pelo nome (sem acento/maiúscula). Por padrão só SIMULA e mostra o que mudaria;
// para gravar: APLICAR=sim npx tsx prisma/atualizar-precos.ts
// Não cria nem apaga produtos; os que não estão na planilha são DESATIVADOS (reversível no Admin).
// Vendas antigas não mudam (cada venda guarda o próprio preço).

type Linha = { nome: string; kg?: true; preco: number; categoria?: string };

const PLANILHA: Linha[] = [
  { nome: "Picolé", preco: 5 },

  { nome: "Água mineral com gás", preco: 4.5 },
  { nome: "Água mineral sem gás", preco: 3.5 },
  { nome: "Energético", preco: 12 },
  { nome: "Long Neck Diversas", preco: 10 },
  { nome: "Refrigerante lata", preco: 5 },
  { nome: "Refrigerante litro", preco: 10 },
  { nome: "Sucos industrializados", preco: 5 },

  { nome: "Bolo chocolate", preco: 6 },
  { nome: "Bolo Chocolate e Baunilha", preco: 6 },
  { nome: "Bolo de aipim", preco: 8 },
  { nome: "Bolo de banana", preco: 8 },
  { nome: "Bolo de Baunilha", preco: 6 },
  { nome: "Bolo de brigadeiro", preco: 10 },
  { nome: "Bolo de cenoura c/ chocolate", preco: 10 },
  { nome: "Bolo de milho", preco: 8 },
  { nome: "Bolo de tapioca", preco: 8 },
  { nome: "Bolo formigueiro", preco: 6 },
  { nome: "Bolo Pudim", preco: 10 },
  { nome: "Brigadeiro, Casadinho e Beijinho", preco: 4 },
  { nome: "Cuscuz de tapioca", preco: 8 },
  { nome: "Pudim", preco: 8 },

  { nome: "Iogurte com frutas/granola", preco: 8 },
  { nome: "Mix de Frutas com Mel, Aveia e Granola", preco: 12 },
  { nome: "Omelete Carne, frango ou vegetariano", preco: 15 },
  { nome: "Ovo (cozido, mexido, frito)", preco: 4 },
  { nome: "Salada de frutas", preco: 6 },
  { nome: "Vitamina de banana", preco: 10 },
  { nome: "Vitamina da Temporada", preco: 15, categoria: "Café da manhã / ovos" },

  { nome: "Café Coado", preco: 2 },
  { nome: "Café com leite", preco: 3 },
  { nome: "Café expresso", preco: 5 },
  { nome: "Chá do dia", preco: 5 },
  { nome: "Chocolate quente ou frio", preco: 9 },

  { nome: "Cuscuz Farofa/Marroquino", preco: 20 },
  { nome: "Cuscuz Paulista", preco: 16 },
  { nome: "Cuscuz Tradicional", preco: 12 },

  { nome: "Hambúrguer artesanal completo", preco: 20 },
  { nome: "Hambúrguer artesanal simples", preco: 15 },

  { nome: "Baguetes Variados", kg: true, preco: 20.99 },
  { nome: "Croissant de Chocolate", preco: 12 },
  { nome: "Croissant tradicional", preco: 12 },
  { nome: "Donuts", preco: 8 },
  { nome: "Pão com gergelim", kg: true, preco: 19.99 },
  { nome: "Pão de batata", kg: true, preco: 19.99 },
  { nome: "Pão de Cacau", kg: true, preco: 19.99 },
  { nome: "Pão de coco", preco: 19.99 },
  { nome: "Pão de forma integral", kg: true, preco: 24.99 },
  { nome: "Pão de forma normal", kg: true, preco: 21.99 },
  { nome: "Pão de Hot dog", kg: true, preco: 15.99 },
  { nome: "Pão de leite", kg: true, preco: 15.99 },
  { nome: "Pão de milho", kg: true, preco: 15.99 },
  { nome: "Pão de sal / pão francês", kg: true, preco: 15.99 },
  { nome: "Pão de sal integral", kg: true, preco: 21.99 },
  { nome: "Pão delícia", preco: 8 },
  { nome: "Pão Farofa", preco: 3 },
  { nome: "Pão hambúrguer", kg: true, preco: 12 },
  { nome: "Sonho", preco: 3 },

  { nome: "Misto queijo e presunto", preco: 9 },
  { nome: "Pão com Carne de Panela e Cream cheese", preco: 25 },
  { nome: "Pão com manteiga", preco: 3.5 },
  { nome: "Pão com ovo", preco: 5 },
  { nome: "Pão com queijo", preco: 5 },
  { nome: "Pão com queijo e ovo", preco: 7.5 },
  { nome: "Pão com queijo e presunto", preco: 7.5 },
  { nome: "Pão com queijo, ovo e presunto", preco: 10 },

  { nome: "Batata frita", preco: 15 },

  { nome: "Lasanha 4 queijos", preco: 18 },
  { nome: "Lasanha Bolonhesa", preco: 18 },
  { nome: "Lasanha Queijo e presunto", preco: 15 },
  { nome: "Lasanha Vegetariana", preco: 15 },

  { nome: "Bauru Pizza", preco: 8 },
  { nome: "Empada de carne", preco: 8 },
  { nome: "Empada de frango", preco: 8 },
  { nome: "Esfiha de carne", preco: 8 },
  { nome: "Esfiha de frango c/ catupiry", preco: 10 },
  { nome: "Folhado Queijo", preco: 8 },
  { nome: "Pastel de forno de carne", preco: 8 },
  { nome: "Pastel de forno de frango c/ catupiry", preco: 10 },
  { nome: "Quiche de carne seca com banana-da-terra", preco: 10 },
  { nome: "Quiche de Frango c/Catupiry", preco: 10 },
  { nome: "Quiche Napolitana", preco: 10 },
  { nome: "Salgados Veganos", preco: 12, categoria: "Salgados assados / forno" },
  { nome: "Tortinha de frango com Catupiry", preco: 10 },

  { nome: "Banana real", preco: 8 },
  { nome: "Coxinha de frango", preco: 8 },
  { nome: "Coxinha de frango com requeijão/Catupiry", preco: 10 },
  { nome: "Pastel de carne 70g", preco: 8 },
  { nome: "Pastel de frango c/ catupiry 70g", preco: 8 },
  { nome: "Pastel de queijo 70g", preco: 8 },
  { nome: "Risole de carne", preco: 8 },
  { nome: "Risole de queijo e presunto", preco: 8 },
  { nome: "Saltenha de carne", preco: 8 },

  { nome: "Tapioca Especial", preco: 20, categoria: "Tapiocas" },
  { nome: "Tapioca simples", preco: 15, categoria: "Tapiocas" },
];

/** Uma linha da planilha que vale para mais de um produto do banco. */
const ALIAS: Record<string, string[]> = {
  "Inhame/Batata doce Cozida/Banana-da-terra cozida": ["Inhame/Batata doce Cozida", "Banana-da-terra cozida"],
  "Mix de Frutas com Mel, Aveia e Granola": ["Mix de Frutas Mel e Aveia granola"],
};
PLANILHA.push({ nome: "Inhame/Batata doce Cozida/Banana-da-terra cozida", preco: 6 });

/** Itens da planilha sem preço: continuam no cardápio como estão. */
const MANTER_SEM_PRECO: Record<string, string[]> = {
  "Açaí 300g (puro, banana, morango ou cupuaçu)": ["Açaí Puro 300g", "Açaí Banana 300g", "Açaí Morango 300g", "Açaí Cupuaçu 300g"],
  "Sorvete 300g": ["Sorvete 300g"],
  "½ Mamão com Mel, aveia e Granola": ["½ Mamão com Mel aveia e Granola"],
  "Carne assada inteira": ["Carne assada inteira"],
  "Codorna assada inteira": ["Codorna assada inteira"],
  "Farofa": ["Farofa"],
  "Frango assado inteiro": ["Frango assado inteiro"],
  "Porco assado": ["Porco assado"],
  "Vinagrete": ["Vinagrete"],
  "Biscoitos diversos": ["Biscoitos diversos"],
  "Broas diversas": ["Broas diversas"],
  "Cookies diversos": ["Cookies diversos"],
  "Pães doces embalados": ["Pães doces embalados"],
  "Pão delícia em embalagem": ["Pão delícia em embalagem"],
  "Sequilhos diversos": ["Sequilhos diversos"],
  "Pão de queijo Chipa": ["Pão de queijo Chipa"],
  "Pão de queijo tradicional": ["Pão de queijo tradicional"],
  "Americano": ["Americano"],
};

/** Sucos da planilha: vale o sabor, em qualquer tamanho (300ml, 500ml, jarra). */
const SABORES_SUCO = ["Abacaxi", "Acerola", "Cupuaçu", "Goiaba", "Graviola", "Laranja", "Limão", "Manga", "Maracujá", "Morango da Casa"];

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b\d+\s?g\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function main() {
  const aplicar = process.env.APLICAR === "sim";
  const produtos = await prisma.producto.findMany({
    select: { id: true, codigo: true, nombre: true, precio: true, tipoUnidad: true },
  });
  const porNome = new Map(produtos.map((p) => [norm(p.nombre), p]));

  const mudancas: { id: string; nome: string; de: string; para: string; data: { precio: number; tipoUnidad?: TipoUnidad } }[] = [];
  const semProduto: string[] = [];
  const criar: Linha[] = [];
  let iguais = 0;

  for (const l of PLANILHA) {
    const alvos = (ALIAS[l.nome] ?? [l.nome]).map((n) => porNome.get(norm(n)));
    if (alvos.every((a) => !a)) {
      criar.push(l);
      semProduto.push(`${l.nome} (R$ ${l.preco.toFixed(2).replace(".", ",")}${l.kg ? "/kg" : ""})`);
      continue;
    }
    for (const p of alvos) {
      if (!p) continue;
      const unidade = l.kg ? TipoUnidad.KG : p.tipoUnidad;
      const igual = Number(p.precio) === l.preco && p.tipoUnidad === unidade;
      if (igual) {
        iguais++;
        continue;
      }
      const fmt = (preco: number, un: TipoUnidad) => `R$ ${preco.toFixed(2).replace(".", ",")}${un === "KG" ? "/kg" : ""}`;
      mudancas.push({
        id: p.id,
        nome: p.nombre,
        de: fmt(Number(p.precio), p.tipoUnidad),
        para: fmt(l.preco, unidade),
        data: { precio: l.preco, ...(unidade !== p.tipoUnidad ? { tipoUnidad: unidade } : {}) },
      });
    }
  }

  // Tudo que não está na planilha sai do cardápio (desativado, não apagado: o histórico de vendas fica).
  const manter = new Set<string>();
  for (const l of PLANILHA) for (const n of ALIAS[l.nome] ?? [l.nome]) manter.add(norm(n));
  for (const nomes of Object.values(MANTER_SEM_PRECO)) for (const n of nomes) manter.add(norm(n));
  for (const sabor of SABORES_SUCO) for (const t of ["300ml", "500ml", "Jarra"]) manter.add(norm(`Suco de ${sabor} ${t}`));
  const categorias = new Map((await prisma.categoria.findMany()).map((c) => [c.id, c.nombre]));
  const ativos = await prisma.producto.findMany({ where: { activo: true }, select: { id: true, nombre: true, categoriaId: true } });
  const sair = ativos.filter((p) => !manter.has(norm(p.nombre)));

  console.log(`Planilha: ${PLANILHA.length} linhas · já iguais: ${iguais} · a mudar: ${mudancas.length} · sem produto no banco: ${semProduto.length}\n`);
  console.log("A MUDAR");
  for (const m of mudancas) console.log(`  ${m.nome}: ${m.de} -> ${m.para}`);
  console.log("\nSEM PRODUTO NO BANCO (não criados)");
  for (const s of semProduto) console.log(`  ${s}`);

  console.log(`
SAEM DO CARDÁPIO (desativados): ${sair.length} de ${ativos.length} ativos`);
  const porCategoria = new Map<string, string[]>();
  for (const p of sair) porCategoria.set(categorias.get(p.categoriaId) ?? "?", [...(porCategoria.get(categorias.get(p.categoriaId) ?? "?") ?? []), p.nombre]);
  for (const [cat, nomes] of Array.from(porCategoria)) console.log(`  ${cat}: ${nomes.join(" · ")}`);

  if (!aplicar) {
    console.log("\nSimulação: nada foi gravado. Para gravar: APLICAR=sim npx tsx prisma/atualizar-precos.ts");
    return;
  }
  // Itens da planilha que ainda não existem entram já ativos, na categoria indicada.
  const idCategoria = new Map(Array.from(categorias).map(([id, nome]) => [nome, id]));
  const codigos = (await prisma.producto.findMany({ select: { codigo: true } })).map(
    (p) => Number(p.codigo.replace(/\D/g, "")) || 0
  );
  let proximo = Math.max(0, ...codigos) + 1;
  const novos = criar.map((l) => {
    const categoriaId = idCategoria.get(l.categoria ?? "");
    if (!categoriaId) throw new Error(`Categoria não encontrada para ${l.nome}: ${l.categoria}`);
    return {
      codigo: `PM-${String(proximo++).padStart(4, "0")}`,
      nombre: l.nome,
      categoriaId,
      precio: l.preco,
      tipoUnidad: l.kg ? TipoUnidad.KG : TipoUnidad.UNIDAD,
      stockActual: 100,
    };
  });

  await prisma.$transaction([
    ...mudancas.map((m) => prisma.producto.update({ where: { id: m.id }, data: m.data })),
    prisma.producto.createMany({ data: novos }),
    prisma.producto.updateMany({ where: { id: { in: sair.map((p) => p.id) } }, data: { activo: false } }),
  ]);
  console.log(
    `\nGravado: ${mudancas.length} produtos atualizados, ${novos.length} criados e ${sair.length} desativados.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
