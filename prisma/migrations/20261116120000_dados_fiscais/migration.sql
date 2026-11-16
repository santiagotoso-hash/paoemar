-- CreateEnum
CREATE TYPE "AmbienteFiscal" AS ENUM ('HOMOLOGACAO', 'PRODUCAO');

-- AlterTable
ALTER TABLE "Categoria" ADD COLUMN     "cfopPadrao" TEXT,
ADD COLUMN     "csosnPadrao" TEXT,
ADD COLUMN     "ncmPadrao" TEXT,
ADD COLUMN     "origemPadrao" INTEGER;

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "cfop" TEXT,
ADD COLUMN     "csosn" TEXT,
ADD COLUMN     "ncm" TEXT,
ADD COLUMN     "origem" INTEGER;

-- CreateTable
CREATE TABLE "ConfiguracaoFiscal" (
    "id" TEXT NOT NULL DEFAULT 'unica',
    "ativa" BOOLEAN NOT NULL DEFAULT false,
    "ambiente" "AmbienteFiscal" NOT NULL DEFAULT 'HOMOLOGACAO',
    "cnpj" TEXT,
    "atualizadaEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoFiscal_pkey" PRIMARY KEY ("id")
);
