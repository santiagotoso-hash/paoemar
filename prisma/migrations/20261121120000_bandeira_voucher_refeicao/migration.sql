-- Hipercard passa a ser "Voucher Refeição" (renomeia o valor; vendas antigas mantêm o registro).
ALTER TYPE "BandeiraCartao" RENAME VALUE 'HIPERCARD' TO 'VOUCHER_REFEICAO';
