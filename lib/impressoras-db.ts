import { prisma } from "@/lib/prisma";
import { configPadrao, type ConfigImpressora, type Destino } from "@/lib/impressoras";

/** Configuração da impressora do destino (valores padrão, desativada, se ainda não foi configurada). */
export async function lerConfigImpressora(destino: Destino): Promise<ConfigImpressora> {
  const i = await prisma.impressora.findUnique({ where: { destino } });
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
}
