import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MESAS_DA_CASA } from "@/lib/mesas";
import { AbrirMesaForm } from "./abrir-mesa-form";

export default async function AbrirMesaPage({
  searchParams,
}: {
  searchParams: { tipo?: string; rotulo?: string };
}) {
  const abertas = await prisma.comanda.findMany({
    where: { estado: "ABIERTA" },
    select: { id: true, codigo: true, tipo: true },
  });

  const tipoInicial = searchParams.tipo === "NOMBRE" ? "NOMBRE" : "NUMERO";
  const rotuloInicial = (searchParams.rotulo ?? "").slice(0, 40);

  return (
    <div className="flex flex-col gap-5 pb-24">
      <div className="flex items-center gap-2">
        <Link
          href="/mesas"
          aria-label="Voltar para as mesas"
          className="-ml-2 inline-flex size-11 items-center justify-center rounded-xl hover:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-semibold">Abrir mesa</h1>
      </div>

      <AbrirMesaForm
        abertas={abertas}
        lugares={MESAS_DA_CASA.filter((m) => m.tipo === "NOMBRE").map((m) => m.rotulo)}
        tipoInicial={tipoInicial}
        rotuloInicial={tipoInicial === "NUMERO" ? rotuloInicial.replace(/\D/g, "").slice(0, 3) : rotuloInicial}
      />
    </div>
  );
}
