-- Formas de pagamento: Transferência vira Pix e cartões passam a guardar a bandeira.

-- Renomear (em vez de recriar o enum): nunca falha, mesmo que existam vendas antigas
-- por transferência — elas passam a aparecer como Pix.
-- AlterEnum
ALTER TYPE "MetodoPago" RENAME VALUE 'TRANSFERENCIA' TO 'PIX';

-- CreateEnum
CREATE TYPE "BandeiraCartao" AS ENUM ('VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD', 'OUTRA');

-- AlterTable (opcional: vendas antigas e pagamentos sem cartão ficam com NULL)
ALTER TABLE "Venta" ADD COLUMN     "bandeira" "BandeiraCartao";
