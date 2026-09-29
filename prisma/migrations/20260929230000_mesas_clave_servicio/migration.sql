-- Sobre el schema de atendimento_mesas (que en producción se cargó con db push):
-- clave de envío de rondas y servicio desactivado por defecto.

-- AlterTable
ALTER TABLE "Comanda" ALTER COLUMN "servicio" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Ronda" ADD COLUMN     "clave" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Ronda_clave_key" ON "Ronda"("clave");


-- Las comandas de la pantalla vieja (sin atendente) que siguen abiertas quedaron con
-- servicio=true por el default anterior: vuelven a no cobrar servicio, como antes.
UPDATE "Comanda" SET "servicio" = false WHERE "atendenteId" IS NULL AND "estado" = 'ABIERTA';
