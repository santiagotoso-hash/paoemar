import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando o Seed do Cardápio Completo...");

  // =========================================================================
  // 1. LIMPEZA — Apaga tudo para re-popular do zero
  // =========================================================================
  await prisma.ventaItemAdicional.deleteMany();
  await prisma.comandaItemAdicional.deleteMany();
  await prisma.ventaItem.deleteMany();
  await prisma.comandaItem.deleteMany();
  await prisma.venta.deleteMany();
  await prisma.comanda.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.adicional.deleteMany();
  await prisma.categoria.deleteMany();

  // =========================================================================
  // 2. ADICIONAIS / OPCIONAIS / MOLHOS
  // =========================================================================
  const adicionaisData = [
    { nombre: "Leite quente", precio: 2.0 },
    { nombre: "Carne seca", precio: 8.0 },
    { nombre: "Carne do sol", precio: 8.0 },
    { nombre: "Banana-da-terra", precio: 4.0 },
    { nombre: "Queijo coalho", precio: 5.0 },
    { nombre: "Mussarela", precio: 4.0 },
    { nombre: "Bacon", precio: 5.0 },
    { nombre: "Ovo frito", precio: 3.0 },
    { nombre: "Ovo mexido", precio: 3.0 },
    { nombre: "Ovo cozido", precio: 3.0 },
    { nombre: "Calabresa", precio: 4.0 },
    { nombre: "Frango", precio: 6.0 },
    { nombre: "Barbecue", precio: 2.0 },
    { nombre: "Chipotle", precio: 2.0 },
    { nombre: "Maionese e Alho", precio: 2.0 },
    { nombre: "Granola", precio: 3.0 },
    { nombre: "Leite em pó", precio: 3.0 },
    { nombre: "Paçoca", precio: 2.0 },
    { nombre: "Leite condensado", precio: 3.0 },
    { nombre: "Coberturas", precio: 2.0 },
  ];

  const adicionaisCriados = [];
  for (const ad of adicionaisData) {
    const criado = await prisma.adicional.create({ data: ad });
    adicionaisCriados.push(criado);
  }

  const findAd = (nomes: string[]) =>
    adicionaisCriados.filter((a) => nomes.includes(a.nombre)).map((a) => ({ id: a.id }));

  const adCuscuzTapioca = findAd([
    "Leite quente", "Carne seca", "Carne do sol", "Banana-da-terra",
    "Queijo coalho", "Mussarela", "Bacon", "Ovo frito", "Ovo mexido",
    "Ovo cozido", "Calabresa", "Frango",
  ]);
  const adHamburguer = findAd(["Barbecue", "Chipotle", "Maionese e Alho"]);
  const adAcai = findAd(["Granola", "Leite em pó", "Paçoca", "Leite condensado", "Coberturas"]);
  const adSalada = findAd(["Queijo coalho"]);

  // =========================================================================
  // 3. CATEGORIAS (campo do schema = "nombre")
  // =========================================================================
  const categoriasData = [
    { nombre: "Pães e panificação", icono: "🥖" },
    { nombre: "Salgados fritos", icono: "🥟" },
    { nombre: "Salgados assados / forno", icono: "🥐" },
    { nombre: "Cuscuz", icono: "🥘" },
    { nombre: "Tapiocas", icono: "🌮" },
    { nombre: "Pães na chapa e sanduíches", icono: "🥪" },
    { nombre: "Hambúrgueres", icono: "🍔" },
    { nombre: "Café da manhã / ovos", icono: "🍳" },
    { nombre: "Bolos e doces", icono: "🍰" },
    { nombre: "Linha embalada", icono: "🍪" },
    { nombre: "Pratos rápidos e massas", icono: "🍝" },
    { nombre: "Petiscos / porções", icono: "🍟" },
    { nombre: "Frango assado / rotisserie", icono: "🍗" },
    { nombre: "Açaí e Sorvetes", icono: "🍧" },
    { nombre: "Sucos e vitaminas", icono: "🧃" },
    { nombre: "Cafeteria", icono: "☕" },
    { nombre: "Bebidas", icono: "🥤" },
    { nombre: "Combos Pão & Mar", icono: "🏷️" },
  ];

  const cats: Record<string, string> = {};
  for (const c of categoriasData) {
    const criada = await prisma.categoria.create({ data: c });
    cats[c.nombre] = criada.id;
  }

  // =========================================================================
  // 4. HELPER — Criar produto
  // =========================================================================
  let seq = 1;
  const cod = () => `PM-${String(seq++).padStart(4, "0")}`;

  async function prod(nombre: string, cat: string, precio: number, adicionais: { id: string }[] = []) {
    await prisma.producto.create({
      data: {
        codigo: cod(),
        nombre,
        categoriaId: cats[cat],
        precio,
        stockActual: 100,
        adicionais: adicionais.length ? { connect: adicionais } : undefined,
      },
    });
  }

  // =========================================================================
  // 5. PRODUTOS POR CATEGORIA
  // =========================================================================

  // --- 1. Pães e panificação ---
  const CAT1 = "Pães e panificação";
  await prod("Pão Halá", CAT1, 5);
  await prod("Pão de sal / pão francês", CAT1, 2);
  await prod("Pão de sal integral", CAT1, 3);
  await prod("Pão de milho", CAT1, 4);
  await prod("Pão de leite", CAT1, 4);
  await prod("Pão de batata", CAT1, 4);
  await prod("Pão de Cacau", CAT1, 5);
  await prod("Baguetes Variados", CAT1, 8);
  await prod("Pão de forma normal", CAT1, 10);
  await prod("Pão de forma integral", CAT1, 12);
  await prod("Pão hambúrguer", CAT1, 3);
  await prod("Pão de Hot dog", CAT1, 3);
  await prod("Pão com gergelim", CAT1, 3);
  await prod("Pão delícia", CAT1, 6);
  await prod("Pão Farofa", CAT1, 5);
  await prod("Pão de coco", CAT1, 5);
  await prod("Pão de queijo tradicional", CAT1, 5);
  await prod("Pão de queijo Chipa", CAT1, 5);
  await prod("Croissant tradicional", CAT1, 7);
  await prod("Croissant de Chocolate", CAT1, 9);
  await prod("Sonho", CAT1, 7);
  await prod("Donuts", CAT1, 8);

  // --- 2. Salgados fritos ---
  const CAT2 = "Salgados fritos";
  await prod("Coxinha de frango", CAT2, 8);
  await prod("Coxinha de frango com requeijão/Catupiry", CAT2, 9);
  await prod("Risole de queijo e presunto", CAT2, 8);
  await prod("Risole de carne", CAT2, 8);
  await prod("Pastel de carne", CAT2, 8);
  await prod("Pastel de frango c/ catupiry", CAT2, 9);
  await prod("Pastel de queijo", CAT2, 8);
  await prod("Banana real", CAT2, 7);
  await prod("Saltenha de carne", CAT2, 9);

  // --- 3. Salgados assados / forno ---
  const CAT3 = "Salgados assados / forno";
  await prod("Empanada Chilena", CAT3, 10);
  await prod("Quibe", CAT3, 7);
  await prod("Esfiha de carne", CAT3, 7);
  await prod("Esfiha de frango c/ catupiry", CAT3, 8);
  await prod("Esfiha de Nutella", CAT3, 8);
  await prod("Pastel de forno de carne", CAT3, 8);
  await prod("Pastel de forno de frango c/ catupiry", CAT3, 9);
  await prod("Empada de frango", CAT3, 8);
  await prod("Empada de carne", CAT3, 8);
  await prod("Tortinha de frango com Catupiry", CAT3, 9);
  await prod("Quiche de carne seca com banana-da-terra", CAT3, 14);
  await prod("Quiche de Frango c/ Catupiry", CAT3, 12);
  await prod("Quiche Napolitana", CAT3, 12);
  await prod("Folhado Queijo", CAT3, 8);
  await prod("Folhado Espinafre c/ Queijo Feta", CAT3, 10);
  await prod("Bauru Pizza", CAT3, 10);

  // --- 4. Cuscuz (com adicionais) ---
  const CAT4 = "Cuscuz";
  await prod("Cuscuz Tradicional", CAT4, 12, adCuscuzTapioca);
  await prod("Cuscuz Paulista", CAT4, 14, adCuscuzTapioca);
  await prod("Cuscuz Farofa/Marroquino", CAT4, 14, adCuscuzTapioca);

  // --- 5. Tapiocas (com adicionais) ---
  const CAT5 = "Tapiocas";
  await prod("Tapioca com Mussarela ou Queijo coalho", CAT5, 12, adCuscuzTapioca);
  await prod("Tapioca com Mussarela e presunto", CAT5, 14, adCuscuzTapioca);
  await prod("Tapioca de carne seca com banana-da-terra", CAT5, 16, adCuscuzTapioca);
  await prod("Tapioca de banana ou morango c/ nutella", CAT5, 14, adCuscuzTapioca);

  // --- 6. Pães na chapa e sanduíches ---
  const CAT6 = "Pães na chapa e sanduíches";
  await prod("Pão com manteiga", CAT6, 5);
  await prod("Pão com ovo", CAT6, 7);
  await prod("Pão com queijo", CAT6, 8);
  await prod("Pão com queijo e ovo", CAT6, 10);
  await prod("Pão com queijo e presunto", CAT6, 10);
  await prod("Pão com queijo, ovo e presunto", CAT6, 12);
  await prod("Pão com queijo, pepino e tomate", CAT6, 10);
  await prod("Pão com Carne de Panela e Cream cheese", CAT6, 16);
  await prod("Misto queijo e presunto", CAT6, 10);
  await prod("Misto queijo e Ketchup", CAT6, 9);
  await prod("Americano", CAT6, 14);

  // --- 7. Hambúrgueres (com molhos adicionais) ---
  const CAT7 = "Hambúrgueres";
  await prod("Hambúrguer artesanal simples", CAT7, 22, adHamburguer);
  await prod("Hambúrguer artesanal especial", CAT7, 28, adHamburguer);
  await prod("Hambúrguer artesanal completo", CAT7, 34, adHamburguer);

  // --- 8. Café da manhã / ovos ---
  const CAT8 = "Café da manhã / ovos";
  await prod("Ovo (cozido, mexido, frito)", CAT8, 5);
  await prod("Omelete Carne, frango ou vegetariano", CAT8, 14);
  await prod("Salada de frutas", CAT8, 12);
  await prod("Banana-da-terra cozida", CAT8, 6);
  await prod("Inhame/Batata doce Cozida", CAT8, 6);
  await prod("½ Mamão com Mel aveia e Granola", CAT8, 14);
  await prod("½ Abacate com Mel Aveia e Linhaça", CAT8, 14);
  await prod("Mix de Frutas Mel e Aveia granola", CAT8, 16);
  await prod("Iogurte com frutas/granola", CAT8, 12);
  await prod("Café da manhã combo 1", CAT8, 18);
  await prod("Café da manhã combo 2", CAT8, 24);
  await prod("Café da manhã combo 3", CAT8, 30);
  await prod("Vitamina de banana", CAT8, 10);
  await prod("Vitamina de abacate", CAT8, 12);

  // --- 9. Bolos e doces ---
  const CAT9 = "Bolos e doces";
  await prod("Bolo de milho", CAT9, 8);
  await prod("Bolo de aipim", CAT9, 8);
  await prod("Bolo de banana", CAT9, 8);
  await prod("Bolo de tapioca", CAT9, 8);
  await prod("Bolo de cenoura c/ chocolate", CAT9, 9);
  await prod("Bolo formigueiro", CAT9, 8);
  await prod("Bolo chocolate", CAT9, 9);
  await prod("Bolo Chocolate e Baunilha", CAT9, 9);
  await prod("Bolo de Baunilha", CAT9, 8);
  await prod("Bolo de brigadeiro", CAT9, 10);
  await prod("Bolo Pudim", CAT9, 10);
  await prod("Pudim", CAT9, 8);
  await prod("Torta búlgara", CAT9, 12);
  await prod("Brigadeiro, Casadinho e Beijinho", CAT9, 4);
  await prod("Lelê", CAT9, 5);
  await prod("Canjica", CAT9, 8);
  await prod("Cuscuz de tapioca", CAT9, 8);

  // --- 10. Linha embalada ---
  const CAT10 = "Linha embalada";
  await prod("Biscoitos diversos", CAT10, 10);
  await prod("Sequilhos diversos", CAT10, 10);
  await prod("Cookies diversos", CAT10, 12);
  await prod("Broas diversas", CAT10, 10);
  await prod("Pães doces embalados", CAT10, 12);
  await prod("Pão delícia em embalagem", CAT10, 14);

  // --- 11. Pratos rápidos e massas ---
  const CAT11 = "Pratos rápidos e massas";
  await prod("Lasanha Bolonhesa", CAT11, 28);
  await prod("Lasanha 4 queijos", CAT11, 28);
  await prod("Lasanha Queijo e presunto", CAT11, 26);
  await prod("Lasanha Vegetariana", CAT11, 26);
  await prod("Massa Bolonhesa", CAT11, 22);
  await prod("Massa Alho e óleo", CAT11, 18);
  await prod("Massa Napolitana (Molho de tomate e Manjericão)", CAT11, 20);
  await prod("Massa 3 queijos", CAT11, 22);
  await prod("Massa Vegetariana", CAT11, 20);
  await prod("Strogonoff de frango", CAT11, 24);
  await prod("Escondidinho de Carne de sol c/ queijo coalho", CAT11, 26);
  await prod("Escondidinho de Fumeiro c/ queijo coalho", CAT11, 26);
  await prod("Salada Caesar", CAT11, 18, adSalada);
  await prod("Salada bahiana", CAT11, 16, adSalada);
  await prod("Salada tropical", CAT11, 16, adSalada);
  await prod("Salada c/ queijo", CAT11, 18, adSalada);

  // --- 13. Petiscos / porções ---
  const CAT13 = "Petiscos / porções";
  await prod("Carne do sol", CAT13, 30);
  await prod("Bolinho de peixe", CAT13, 18);
  await prod("Caldo de Sururu", CAT13, 20);
  await prod("Aipim Frito", CAT13, 14);
  await prod("Batata frita", CAT13, 14);

  // --- 14. Frango assado / rotisserie ---
  const CAT14 = "Frango assado / rotisserie";
  await prod("Frango assado inteiro", CAT14, 45);
  await prod("Codorna assada inteira", CAT14, 25);
  await prod("Carne assada inteira", CAT14, 55);
  await prod("Porco assado", CAT14, 60);
  await prod("Farofa", CAT14, 8);
  await prod("Vinagrete", CAT14, 6);

  // --- 15. Açaí e Sorvetes (com adicionais) ---
  const CAT15 = "Açaí e Sorvetes";
  await prod("Açaí Puro 300g", CAT15, 16, adAcai);
  await prod("Açaí Banana 300g", CAT15, 18, adAcai);
  await prod("Açaí Morango 300g", CAT15, 18, adAcai);
  await prod("Açaí Cupuaçu 300g", CAT15, 18, adAcai);
  await prod("Açaí Puro 500g", CAT15, 22, adAcai);
  await prod("Açaí Banana 500g", CAT15, 24, adAcai);
  await prod("Açaí Morango 500g", CAT15, 24, adAcai);
  await prod("Açaí Cupuaçu 500g", CAT15, 24, adAcai);
  await prod("Sorvete 300g", CAT15, 14);
  await prod("Picolé", CAT15, 6);

  // --- 17. Sucos e vitaminas ---
  const CAT17 = "Sucos e vitaminas";
  const sucosSabores = [
    "Manga", "Laranja", "Limão", "Abacaxi", "Maracujá", "Cupuaçu",
    "Graviola", "Cacau", "Acerola", "Mirtilo da Casa", "Amora da Casa",
    "Morango da Casa",
  ];
  for (const sabor of sucosSabores) {
    await prod(`Suco de ${sabor} 300ml`, CAT17, 8);
    await prod(`Suco de ${sabor} 500ml`, CAT17, 12);
    await prod(`Suco de ${sabor} Jarra`, CAT17, 20);
  }
  await prod("Sucos combinados 300ml", CAT17, 10);
  await prod("Sucos combinados 500ml", CAT17, 14);
  await prod("Sucos combinados Jarra", CAT17, 22);
  await prod("Sucos detox 300ml", CAT17, 12);
  await prod("Sucos detox 500ml", CAT17, 16);
  await prod("Sucos detox Jarra", CAT17, 24);

  // --- 18. Cafeteria ---
  const CAT18 = "Cafeteria";
  await prod("Café expresso", CAT18, 5);
  await prod("Café com leite", CAT18, 7);
  await prod("Café Cuado", CAT18, 6);
  await prod("Chocolate quente ou frio", CAT18, 9);
  await prod("Café gelado", CAT18, 8);
  await prod("Chá do dia", CAT18, 5);

  // --- 19. Bebidas ---
  const CAT19 = "Bebidas";
  await prod("Água mineral sem gás", CAT19, 3);
  await prod("Água mineral com gás", CAT19, 4);
  await prod("Refrigerante lata", CAT19, 6);
  await prod("Refrigerante litro", CAT19, 10);
  await prod("Energético", CAT19, 12);
  await prod("Sucos industrializados", CAT19, 6);
  await prod("Long Neck Diversas", CAT19, 10);

  // --- 20. Combos Pão & Mar ---
  const CAT20 = "Combos Pão & Mar";
  await prod("Café + pão com manteiga", CAT20, 8);
  await prod("Café + pão com ovo", CAT20, 10);
  await prod("Café + pão com queijo", CAT20, 11);
  await prod("Café + cuscuz", CAT20, 14);
  await prod("Café + cuscuz com carne do sol", CAT20, 20);
  await prod("Café + tapioca", CAT20, 16);
  await prod("Café + salgado", CAT20, 12);
  await prod("Suco + sanduíche", CAT20, 16);
  await prod("Suco + tapioca", CAT20, 18);
  await prod("Açaí + acompanhamento", CAT20, 22);
  await prod("Frango assado + acompanhamentos", CAT20, 55);
  await prod("Combo família", CAT20, 80);
  await prod("Combo praia", CAT20, 45);
  await prod("Combo café da manhã", CAT20, 25);

  console.log(`✅ Seed finalizado: ${seq - 1} produtos criados em ${Object.keys(cats).length} categorias com ${adicionaisCriados.length} adicionais.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
