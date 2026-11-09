-- CreateTable
CREATE TABLE "TicketImpressao" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "destino" "DestinoImpressao" NOT NULL,
    "titulo" TEXT NOT NULL,
    "linhas" TEXT[],
    "larguraMm" INTEGER NOT NULL,
    "copias" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reservadoEm" TIMESTAMP(3),
    "impressoEm" TIMESTAMP(3),
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,

    CONSTRAINT "TicketImpressao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketImpressao_chave_key" ON "TicketImpressao"("chave");

-- CreateIndex
CREATE INDEX "TicketImpressao_destino_impressoEm_idx" ON "TicketImpressao"("destino", "impressoEm");
