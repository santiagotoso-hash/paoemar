-- CreateEnum
CREATE TYPE "TipoMesa" AS ENUM ('NUMERO', 'NOMBRE');

-- AlterTable
ALTER TABLE "Comanda" ADD COLUMN     "atendenteId" TEXT,
ADD COLUMN     "personas" INTEGER,
ADD COLUMN     "servicio" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tipo" "TipoMesa" NOT NULL DEFAULT 'NOMBRE';

-- AlterTable
ALTER TABLE "ComandaItem" ADD COLUMN     "opcion" TEXT,
ADD COLUMN     "rondaId" TEXT;

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "servicio" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "GrupoOpcion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GrupoOpcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opcion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "grupoId" TEXT NOT NULL,

    CONSTRAINT "Opcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adicional" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "Adicional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Atendente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Atendente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ronda" (
    "id" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "atendenteId" TEXT NOT NULL,
    "clave" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoVenta" NOT NULL DEFAULT 'RECIBIDO',

    CONSTRAINT "Ronda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComandaItemAdicional" (
    "id" TEXT NOT NULL,
    "comandaItemId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "ComandaItemAdicional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaItemAdicional" (
    "id" TEXT NOT NULL,
    "ventaItemId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "VentaItemAdicional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AdicionalToProducto" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AdicionalToProducto_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ronda_clave_key" ON "Ronda"("clave");

-- CreateIndex
CREATE INDEX "_AdicionalToProducto_B_index" ON "_AdicionalToProducto"("B");

-- AddForeignKey
ALTER TABLE "GrupoOpcion" ADD CONSTRAINT "GrupoOpcion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opcion" ADD CONSTRAINT "Opcion_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "GrupoOpcion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "Atendente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ronda" ADD CONSTRAINT "Ronda_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ronda" ADD CONSTRAINT "Ronda_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "Atendente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComandaItem" ADD CONSTRAINT "ComandaItem_rondaId_fkey" FOREIGN KEY ("rondaId") REFERENCES "Ronda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComandaItemAdicional" ADD CONSTRAINT "ComandaItemAdicional_comandaItemId_fkey" FOREIGN KEY ("comandaItemId") REFERENCES "ComandaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaItemAdicional" ADD CONSTRAINT "VentaItemAdicional_ventaItemId_fkey" FOREIGN KEY ("ventaItemId") REFERENCES "VentaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdicionalToProducto" ADD CONSTRAINT "_AdicionalToProducto_A_fkey" FOREIGN KEY ("A") REFERENCES "Adicional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdicionalToProducto" ADD CONSTRAINT "_AdicionalToProducto_B_fkey" FOREIGN KEY ("B") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

