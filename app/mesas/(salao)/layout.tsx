import { redirect } from "next/navigation";
import { getAtendenteActual } from "@/lib/atendente";

/** Todas as telas de mesa exigem um atendente identificado com PIN. */
export default async function SalaoLayout({ children }: { children: React.ReactNode }) {
  const atendente = await getAtendenteActual();
  if (!atendente) redirect("/mesas/entrar");

  return <>{children}</>;
}
