-- AlterTable
ALTER TABLE "Atendente" ADD COLUMN     "supervisor" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Ronda" ADD COLUMN     "estadoDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "CancelamentoItem" (
    "id" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "rondaId" TEXT,
    "productoId" TEXT NOT NULL,
    "productoNombre" TEXT NOT NULL,
    "detalhe" TEXT,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "motivo" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "atendenteId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CancelamentoItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CancelamentoItem_criadoEm_idx" ON "CancelamentoItem"("criadoEm");

-- AddForeignKey
ALTER TABLE "CancelamentoItem" ADD CONSTRAINT "CancelamentoItem_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancelamentoItem" ADD CONSTRAINT "CancelamentoItem_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Atendente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancelamentoItem" ADD CONSTRAINT "CancelamentoItem_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "Atendente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

