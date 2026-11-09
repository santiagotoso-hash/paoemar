-- CreateEnum
CREATE TYPE "DestinoImpressao" AS ENUM ('COZINHA', 'PRODUCAO');

-- CreateEnum
CREATE TYPE "ConexaoImpressora" AS ENUM ('REDE', 'USB', 'BLUETOOTH');

-- CreateTable
CREATE TABLE "Impressora" (
    "id" TEXT NOT NULL,
    "destino" "DestinoImpressao" NOT NULL,
    "nome" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "conexao" "ConexaoImpressora" NOT NULL DEFAULT 'REDE',
    "endereco" TEXT,
    "porta" INTEGER,
    "larguraMm" INTEGER NOT NULL DEFAULT 80,
    "copias" INTEGER NOT NULL DEFAULT 1,
    "atualizadaEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Impressora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Impressora_destino_key" ON "Impressora"("destino");
