import { redirect } from "next/navigation";
import { getAtendenteActual } from "@/lib/atendente";
import { BloqueioInatividade } from "../bloqueio-inatividade";
import { GuardaSaidaMesa } from "../guarda-saida-mesa";
import { AlertasPedidoParado } from "../alertas-pedido-parado";

/** Todas as telas de mesa exigem um atendente identificado com PIN. */
export default async function SalaoLayout({ children }: { children: React.ReactNode }) {
  const atendente = await getAtendenteActual();
  if (!atendente) redirect("/mesas/entrar");

  return (
    <>
      {children}
      {/* key: troca de atendente reinicia o relógio de inatividade */}
      <BloqueioInatividade key={atendente.id} atendente={atendente} />
      <GuardaSaidaMesa />
      <AlertasPedidoParado key={`alertas-${atendente.id}`} />
    </>
  );
}
