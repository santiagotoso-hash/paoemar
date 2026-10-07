-- Linha do tempo da rodada na cozinha (lançado/recebido = "creadaEn", que já existe).
-- Colunas opcionais: rodadas antigas ficam com NULL.

-- AlterTable
ALTER TABLE "Ronda" ADD COLUMN     "emPreparoEm" TIMESTAMP(3),
ADD COLUMN     "entregueEm" TIMESTAMP(3),
ADD COLUMN     "prontoEm" TIMESTAMP(3);
