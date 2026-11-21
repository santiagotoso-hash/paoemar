-- Produto pode sair na impressora do Caixa.
ALTER TABLE "Producto" ADD COLUMN "imprimirCaixa" BOOLEAN NOT NULL DEFAULT false;
