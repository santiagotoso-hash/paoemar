-- CreateEnum
CREATE TYPE "UnidadeInsumo" AS ENUM ('UN', 'KG', 'G', 'L', 'ML');

-- CreateEnum
CREATE TYPE "OrigemCompra" AS ENUM ('MANUAL', 'XML');

-- CreateEnum
CREATE TYPE "TipoMovimentoEstoque" AS ENUM ('ENTRADA_COMPRA', 'ENTRADA_MANUAL', 'AJUSTE', 'PERDA', 'SAIDA_VENDA');

-- CreateTable
CREATE TABLE "Insumo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "unidade" "UnidadeInsumo" NOT NULL DEFAULT 'UN',
    "estoqueAtual" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "estoqueMinimo" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "custoMedio" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceitaItem" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "quantidade" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "ReceitaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fornecedor" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FornecedorInsumo" (
    "id" TEXT NOT NULL,
    "fornecedorId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,

    CONSTRAINT "FornecedorInsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compra" (
    "id" TEXT NOT NULL,
    "fornecedorId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "serie" TEXT NOT NULL DEFAULT '',
    "chaveAcesso" TEXT,
    "emitidaEm" TIMESTAMP(3) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "observacao" TEXT,
    "origem" "OrigemCompra" NOT NULL DEFAULT 'MANUAL',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompraItem" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(65,30) NOT NULL,
    "custoUnit" DECIMAL(65,30) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "CompraItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentoEstoque" (
    "id" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "tipo" "TipoMovimentoEstoque" NOT NULL,
    "quantidade" DECIMAL(65,30) NOT NULL,
    "custoUnit" DECIMAL(65,30),
    "saldoApos" DECIMAL(65,30) NOT NULL,
    "motivo" TEXT,
    "compraId" TEXT,
    "vendaId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentoEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Insumo_nome_key" ON "Insumo"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "ReceitaItem_produtoId_insumoId_key" ON "ReceitaItem"("produtoId", "insumoId");

-- CreateIndex
CREATE UNIQUE INDEX "Fornecedor_cnpj_key" ON "Fornecedor"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "FornecedorInsumo_fornecedorId_codigo_key" ON "FornecedorInsumo"("fornecedorId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Compra_chaveAcesso_key" ON "Compra"("chaveAcesso");

-- CreateIndex
CREATE INDEX "Compra_emitidaEm_idx" ON "Compra"("emitidaEm");

-- CreateIndex
CREATE UNIQUE INDEX "Compra_fornecedorId_numero_serie_key" ON "Compra"("fornecedorId", "numero", "serie");

-- CreateIndex
CREATE INDEX "MovimentoEstoque_insumoId_criadoEm_idx" ON "MovimentoEstoque"("insumoId", "criadoEm");

-- CreateIndex
CREATE INDEX "MovimentoEstoque_criadoEm_idx" ON "MovimentoEstoque"("criadoEm");

-- AddForeignKey
ALTER TABLE "ReceitaItem" ADD CONSTRAINT "ReceitaItem_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceitaItem" ADD CONSTRAINT "ReceitaItem_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FornecedorInsumo" ADD CONSTRAINT "FornecedorInsumo_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FornecedorInsumo" ADD CONSTRAINT "FornecedorInsumo_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraItem" ADD CONSTRAINT "CompraItem_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraItem" ADD CONSTRAINT "CompraItem_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoEstoque" ADD CONSTRAINT "MovimentoEstoque_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoEstoque" ADD CONSTRAINT "MovimentoEstoque_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

