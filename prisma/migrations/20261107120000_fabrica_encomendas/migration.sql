-- AlterTable
ALTER TABLE "Categoria" ADD COLUMN     "fabrica" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Encomenda" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombreCliente" TEXT NOT NULL,
    "telefone" TEXT,
    "retiradaEm" TIMESTAMP(3) NOT NULL,
    "notas" TEXT,
    "estado" "EstadoVenta" NOT NULL DEFAULT 'RECIBIDO',
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estadoDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emProducaoEm" TIMESTAMP(3),
    "prontoEm" TIMESTAMP(3),
    "entregueEm" TIMESTAMP(3),

    CONSTRAINT "Encomenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncomendaItem" (
    "id" TEXT NOT NULL,
    "encomendaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "notas" TEXT,

    CONSTRAINT "EncomendaItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Encomenda_codigo_key" ON "Encomenda"("codigo");

-- AddForeignKey
ALTER TABLE "EncomendaItem" ADD CONSTRAINT "EncomendaItem_encomendaId_fkey" FOREIGN KEY ("encomendaId") REFERENCES "Encomenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncomendaItem" ADD CONSTRAINT "EncomendaItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

