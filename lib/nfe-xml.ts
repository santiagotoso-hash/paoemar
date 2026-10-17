import { XMLParser } from "fast-xml-parser";
import { redondear4 } from "@/lib/estoque";
import { redondear2 } from "@/lib/format";

export type NFeItem = {
  /** cProd: código do item no cadastro do fornecedor. */
  codigo: string;
  descricao: string;
  /** uCom: unidade comercial da NF (CX, KG, UN…). */
  unidade: string;
  /** qCom, na unidade da NF. */
  quantidade: number;
  /** vProd − vDesc + vFrete + vSeg + vOutro do item. */
  total: number;
};

export type NFeLida = {
  chave: string;
  numero: string;
  serie: string;
  /** AAAA-MM-DD */
  emitidaEm: string;
  fornecedor: { cnpj: string; nome: string };
  itens: NFeItem[];
  total: number;
};

type No = Record<string, unknown>;

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
};
const txt = (v: unknown) => String(v ?? "").trim();

/** Lê o XML de uma NF-e (modelo 55) de compra, com ou sem o envelope nfeProc. */
export function lerNFe(xml: string): NFeLida {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    // Texto sempre como string: preserva zeros à esquerda em cProd/CNPJ/número.
    parseTagValue: false,
    isArray: (nome) => nome === "det",
  });

  let raiz: No;
  try {
    raiz = parser.parse(xml) as No;
  } catch {
    throw new Error("Não foi possível ler o arquivo. Ele é um XML válido?");
  }

  const nfe = ((raiz.nfeProc as No | undefined)?.NFe ?? raiz.NFe) as No | undefined;
  const inf = nfe?.infNFe as No | undefined;
  if (!inf) throw new Error("O arquivo não parece ser uma NF-e (faltou o bloco infNFe)");

  const ide = (inf.ide ?? {}) as No;
  const emit = (inf.emit ?? {}) as No;
  const dets = (inf.det ?? []) as No[];
  if (dets.length === 0) throw new Error("A NF-e não tem itens");

  const itens: NFeItem[] = dets.map((det) => {
    const p = (det.prod ?? {}) as No;
    return {
      codigo: txt(p.cProd),
      descricao: txt(p.xProd),
      unidade: txt(p.uCom).toUpperCase(),
      quantidade: num(p.qCom),
      total: redondear2(num(p.vProd) - num(p.vDesc) + num(p.vFrete) + num(p.vSeg) + num(p.vOutro)),
    };
  });

  return {
    chave: txt(inf["@_Id"]).replace(/^NFe/, ""),
    numero: txt(ide.nNF),
    serie: txt(ide.serie),
    emitidaEm: txt(ide.dhEmi ?? ide.dEmi).slice(0, 10),
    fornecedor: {
      cnpj: txt(emit.CNPJ ?? emit.CPF).replace(/\D/g, ""),
      nome: txt(emit.xNome),
    },
    itens: itens.map((i) => ({ ...i, quantidade: redondear4(i.quantidade) })),
    total: redondear2(itens.reduce((acc, i) => acc + i.total, 0)),
  };
}
