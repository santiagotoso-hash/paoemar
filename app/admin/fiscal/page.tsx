import { prisma } from "@/lib/prisma";
import { dadosEfetivos, faltaFiscal, formatarNcm } from "@/lib/fiscal";
import { FiscalManager } from "./fiscal-manager";

export default async function FiscalPage() {
  const [config, categorias] = await Promise.all([
    prisma.configuracaoFiscal.findUnique({ where: { id: "unica" } }),
    prisma.categoria.findMany({
      orderBy: { nombre: "asc" },
      include: { productos: { where: { activo: true }, select: { ncm: true, cfop: true, csosn: true, origem: true } } },
    }),
  ]);

  return (
    <FiscalManager
      config={{
        ativa: config?.ativa ?? false,
        ambiente: config?.ambiente ?? "HOMOLOGACAO",
        cnpj: config?.cnpj ?? "",
      }}
      // Só indica se existe; o valor do token nunca sai do servidor.
      tokenConfigurado={!!process.env.FOCUSNFE_TOKEN}
      categorias={categorias.map((c) => {
        const padrao = { ncm: c.ncmPadrao, cfop: c.cfopPadrao, csosn: c.csosnPadrao, origem: c.origemPadrao };
        return {
          id: c.id,
          nombre: c.nombre,
          icono: c.icono,
          ncm: c.ncmPadrao ? formatarNcm(c.ncmPadrao) : "",
          cfop: c.cfopPadrao ?? "",
          csosn: c.csosnPadrao ?? "",
          origem: c.origemPadrao,
          produtos: c.productos.length,
          incompletos: c.productos.filter((p) => faltaFiscal(dadosEfetivos(p, padrao)).length > 0).length,
          comDadosProprios: c.productos.filter((p) => p.ncm || p.cfop || p.csosn || p.origem !== null).length,
        };
      })}
    />
  );
}
