import { prisma } from "@/lib/prisma";
import { configPadrao, DESTINOS, type ConfigImpressora } from "@/lib/impressoras";
import { ImpressorasManager } from "./impressoras-manager";

export default async function ImpressorasPage() {
  const salvas = await prisma.impressora.findMany();

  const configs: ConfigImpressora[] = DESTINOS.map((destino) => {
    const i = salvas.find((s) => s.destino === destino);
    if (!i) return configPadrao(destino);
    return {
      destino,
      nome: i.nome,
      ativa: i.ativa,
      conexao: i.conexao,
      endereco: i.endereco ?? "",
      porta: i.porta?.toString() ?? "",
      larguraMm: i.larguraMm === 58 ? 58 : 80,
      copias: i.copias,
    };
  });

  return <ImpressorasManager configs={configs} />;
}
