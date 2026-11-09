-- AlterTable
ALTER TABLE "Encomenda" ADD COLUMN     "confirmadaEm" TIMESTAMP(3);

-- As encomendas que já existiam foram enviadas à Fábrica ao serem criadas: ficam como confirmadas.
UPDATE "Encomenda" SET "confirmadaEm" = "creadaEn" WHERE "confirmadaEm" IS NULL;
