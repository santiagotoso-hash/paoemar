-- Embalagem opcional na venda (custo adicional fixo).
ALTER TABLE "Venta" ADD COLUMN "embalagem" DECIMAL(65,30) NOT NULL DEFAULT 0;
