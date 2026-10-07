-- Formas de pagamento: Pix e bandeira do cartão.
-- Só ADICIONA (não renomeia nem remove): pode ser aplicada antes do deploy do código novo,
-- o código antigo continua funcionando. TRANSFERENCIA fica no enum como legado.

-- AlterEnum
ALTER TYPE "MetodoPago" ADD VALUE 'PIX';

-- CreateEnum
CREATE TYPE "BandeiraCartao" AS ENUM ('VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD', 'OUTRA');

-- AlterTable (opcional: vendas antigas e pagamentos sem cartão ficam com NULL)
ALTER TABLE "Venta" ADD COLUMN     "bandeira" "BandeiraCartao";
