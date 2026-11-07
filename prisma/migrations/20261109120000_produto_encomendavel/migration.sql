-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "encomendavel" BOOLEAN NOT NULL DEFAULT false;

-- Quem já marcou categorias como "Fábrica" não perde nada: os produtos delas viram encomendáveis.
UPDATE "Producto" SET "encomendavel" = true
WHERE "categoriaId" IN (SELECT "id" FROM "Categoria" WHERE "fabrica" = true);

-- A marcação passa a ser por produto, não mais por categoria.
ALTER TABLE "Categoria" DROP COLUMN "fabrica";
