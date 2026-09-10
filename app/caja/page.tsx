import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getResumenCaja } from "@/lib/caja";
import { AbrirCajaForm } from "./abrir-caja-form";
import { CajaAbierta } from "./caja-abierta";

export default async function CajaPage() {
  const { userId } = await getCurrentUser();
  const sesion = await prisma.cajaSesion.findFirst({
    where: { operadorId: userId, abierta: true },
  });

  if (!sesion) {
    return <AbrirCajaForm />;
  }

  const fondoInicial = Number(sesion.fondoInicial);
  const resumen = await getResumenCaja(sesion.id, fondoInicial);

  return (
    <CajaAbierta
      sesion={{
        id: sesion.id,
        fondoInicial: sesion.fondoInicial.toString(),
        abiertaEn: sesion.abiertaEn.toISOString(),
      }}
      resumen={resumen}
    />
  );
}
