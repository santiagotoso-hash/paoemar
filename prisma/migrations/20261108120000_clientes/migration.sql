-- AlterTable
ALTER TABLE "Encomenda" ADD COLUMN     "clienteId" TEXT;

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "endereco" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "cnpj" TEXT,
    "notas" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Encomenda" ADD CONSTRAINT "Encomenda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
