-- CreateEnum
CREATE TYPE "TipoUnidad" AS ENUM ('UNIDAD', 'KG');

-- CreateEnum
CREATE TYPE "EstadoComanda" AS ENUM ('ABIERTA', 'CERRADA');

-- CreateEnum
CREATE TYPE "OrigenVenta" AS ENUM ('MOSTRADOR', 'COMANDA');

-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('RECIBIDO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('SANGRIA', 'SUMINISTRO');

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "icono" TEXT,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "precio" DECIMAL(65,30) NOT NULL,
    "tipoUnidad" "TipoUnidad" NOT NULL DEFAULT 'UNIDAD',
    "descripcion" TEXT,
    "stockActual" DECIMAL(65,30) NOT NULL,
    "stockMinimo" DECIMAL(65,30) NOT NULL DEFAULT 5,
    "imagenUrl" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comanda" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombreCliente" TEXT,
    "estado" "EstadoComanda" NOT NULL DEFAULT 'ABIERTA',
    "abiertaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaEn" TIMESTAMP(3),

    CONSTRAINT "Comanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComandaItem" (
    "id" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "precioUnit" DECIMAL(65,30) NOT NULL,
    "notas" TEXT,

    CONSTRAINT "ComandaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "comandaId" TEXT,
    "origen" "OrigenVenta" NOT NULL,
    "nombreCliente" TEXT NOT NULL DEFAULT 'Mostrador',
    "subtotal" DECIMAL(65,30) NOT NULL,
    "descuento" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "metodoPago" "MetodoPago" NOT NULL,
    "estado" "EstadoVenta" NOT NULL DEFAULT 'RECIBIDO',
    "cajaSesionId" TEXT NOT NULL,
    "operadorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaItem" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "precioUnit" DECIMAL(65,30) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "notas" TEXT,

    CONSTRAINT "VentaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CajaSesion" (
    "id" TEXT NOT NULL,
    "abierta" BOOLEAN NOT NULL DEFAULT true,
    "fondoInicial" DECIMAL(65,30) NOT NULL,
    "operadorId" TEXT NOT NULL,
    "abiertaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaEn" TIMESTAMP(3),

    CONSTRAINT "CajaSesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CajaMovimiento" (
    "id" TEXT NOT NULL,
    "cajaSesionId" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CajaMovimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Producto_codigo_key" ON "Producto"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Venta_codigo_key" ON "Venta"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Venta_comandaId_key" ON "Venta"("comandaId");

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComandaItem" ADD CONSTRAINT "ComandaItem_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComandaItem" ADD CONSTRAINT "ComandaItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_cajaSesionId_fkey" FOREIGN KEY ("cajaSesionId") REFERENCES "CajaSesion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CajaMovimiento" ADD CONSTRAINT "CajaMovimiento_cajaSesionId_fkey" FOREIGN KEY ("cajaSesionId") REFERENCES "CajaSesion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
