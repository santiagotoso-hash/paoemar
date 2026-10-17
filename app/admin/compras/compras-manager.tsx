"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBRL, formatData } from "@/lib/format";
import { TEXTO_UNIDADE, UNIDADES_INSUMO } from "@/lib/estoque";
import type { UnidadeInsumo } from "@prisma/client";
import { lerXmlCompra, salvarCompra, type RascunhoNFe } from "./actions";

type Compra = {
  id: string;
  fornecedor: string;
  numero: string;
  serie: string;
  emitidaEm: string;
  total: string;
  origem: "MANUAL" | "XML";
  itens: number;
};
type Fornecedor = { id: string; nome: string; cnpj: string | null };
type Insumo = { id: string; nome: string; unidade: UnidadeInsumo };

const NOVO = "__novo";

type ItemForm = {
  key: number;
  /** Texto da NF (XML) ou nome do insumo (digitação). */
  descricao: string;
  codigoFornecedor?: string;
  /** "Na NF: 2 CX" — só informativo, ajuda a converter para a unidade do insumo. */
  infoNF?: string;
  insumoId: string;
  novoNome: string;
  novaUnidade: UnidadeInsumo;
  quantidade: string;
  total: string;
};

const erro = (err: unknown) => toast.error(err instanceof Error ? err.message : "Erro ao salvar");
const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

let chave = 0;
const itemVazio = (): ItemForm => ({
  key: ++chave,
  descricao: "",
  insumoId: "",
  novoNome: "",
  novaUnidade: "KG",
  quantidade: "",
  total: "",
});

function CompraForm({
  fornecedores,
  insumos,
  rascunho,
  onDone,
}: {
  fornecedores: Fornecedor[];
  insumos: Insumo[];
  rascunho: RascunhoNFe | null;
  onDone: () => void;
}) {
  const [fornecedorId, setFornecedorId] = useState(rascunho ? (rascunho.fornecedor.id ?? NOVO) : "");
  const [novoNome, setNovoNome] = useState(rascunho?.fornecedor.nome ?? "");
  const [novoCnpj, setNovoCnpj] = useState(rascunho?.fornecedor.cnpj ?? "");
  const [numero, setNumero] = useState(rascunho?.numero ?? "");
  const [serie, setSerie] = useState(rascunho?.serie ?? "");
  const [chaveAcesso, setChaveAcesso] = useState(rascunho?.chave ?? "");
  const [emitidaEm, setEmitidaEm] = useState(rascunho?.emitidaEm || hoje());
  const [observacao, setObservacao] = useState("");
  const [itens, setItens] = useState<ItemForm[]>(
    rascunho
      ? rascunho.itens.map((i) => ({
          key: ++chave,
          descricao: i.descricao,
          codigoFornecedor: i.codigo,
          infoNF: `Na NF: ${i.quantidade} ${i.unidadeNF}`,
          insumoId: i.insumoId ?? NOVO,
          novoNome: i.descricao,
          novaUnidade: i.unidadeSugerida,
          quantidade: String(i.quantidade),
          total: i.total.toFixed(2),
        }))
      : [itemVazio()],
  );
  const [loading, setLoading] = useState(false);

  const insumoPorId = (id: string) => insumos.find((i) => i.id === id);
  const totalNota = itens.reduce((acc, i) => acc + (Number(i.total) || 0), 0);

  function mudar(key: number, parcial: Partial<ItemForm>) {
    setItens((atual) => atual.map((i) => (i.key === key ? { ...i, ...parcial } : i)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fornecedorId) return toast.error("Escolha o fornecedor");
    if (itens.some((i) => !i.insumoId)) return toast.error("Escolha o insumo de cada item");

    setLoading(true);
    try {
      await salvarCompra({
        fornecedorId: fornecedorId === NOVO ? undefined : fornecedorId,
        novoFornecedor: fornecedorId === NOVO ? { nome: novoNome, cnpj: novoCnpj } : undefined,
        numero,
        serie,
        chave: chaveAcesso,
        emitidaEm,
        observacao,
        origem: rascunho ? "XML" : "MANUAL",
        itens: itens.map((i) => ({
          insumoId: i.insumoId === NOVO ? undefined : i.insumoId,
          novoInsumo: i.insumoId === NOVO ? { nome: i.novoNome, unidade: i.novaUnidade } : undefined,
          codigoFornecedor: i.codigoFornecedor,
          descricao: i.insumoId === NOVO ? i.novoNome : i.descricao || (insumoPorId(i.insumoId)?.nome ?? ""),
          quantidade: i.quantidade,
          total: i.total,
        })),
      });
      toast.success("NF lançada e estoque atualizado");
      onDone();
    } catch (err) {
      erro(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Fornecedor</Label>
          <Select
            value={fornecedorId}
            onValueChange={(v) => setFornecedorId(v as string)}
            items={[...fornecedores.map((f) => ({ value: f.id, label: f.nome })), { value: NOVO, label: "+ Novo fornecedor" }]}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Escolha o fornecedor" />
            </SelectTrigger>
            <SelectContent>
              {fornecedores.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome}
                </SelectItem>
              ))}
              <SelectItem value={NOVO}>+ Novo fornecedor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {fornecedorId === NOVO && (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fnome">Nome</Label>
              <Input id="fnome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fcnpj">CNPJ (opcional)</Label>
              <Input id="fcnpj" value={novoCnpj} onChange={(e) => setNovoCnpj(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="numero">Nº da NF</Label>
          <Input id="numero" value={numero} onChange={(e) => setNumero(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="serie">Série</Label>
          <Input id="serie" value={serie} onChange={(e) => setSerie(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="emissao">Emissão</Label>
          <Input id="emissao" type="date" value={emitidaEm} onChange={(e) => setEmitidaEm(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="chave">Chave de acesso (opcional)</Label>
          <Input id="chave" inputMode="numeric" value={chaveAcesso} onChange={(e) => setChaveAcesso(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Itens</Label>
        {itens.map((item) => {
          const un = item.insumoId === NOVO ? TEXTO_UNIDADE[item.novaUnidade] : TEXTO_UNIDADE[insumoPorId(item.insumoId)?.unidade ?? "UN"];
          const custo = Number(item.quantidade) > 0 ? Number(item.total) / Number(item.quantidade) : 0;
          return (
            <div key={item.key} className="flex flex-col gap-2 rounded-lg border p-3">
              {item.infoNF && (
                <p className="text-xs text-muted-foreground">
                  {item.descricao} — {item.infoNF}
                </p>
              )}
              <div className="grid grid-cols-[1fr_7rem_8rem_auto] items-end gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Insumo</Label>
                  <Select
                    value={item.insumoId}
                    onValueChange={(v) => mudar(item.key, { insumoId: v as string })}
                    items={[...insumos.map((i) => ({ value: i.id, label: i.nome })), { value: NOVO, label: "+ Novo insumo" }]}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Escolha o insumo" />
                    </SelectTrigger>
                    <SelectContent>
                      {insumos.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.nome} ({TEXTO_UNIDADE[i.unidade]})
                        </SelectItem>
                      ))}
                      <SelectItem value={NOVO}>+ Novo insumo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Qtd{item.insumoId ? ` (${un})` : ""}</Label>
                  <Input type="number" step="0.001" min="0" value={item.quantidade} onChange={(e) => mudar(item.key, { quantidade: e.target.value })} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Valor total (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={item.total} onChange={(e) => mudar(item.key, { total: e.target.value })} required />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={itens.length === 1}
                  onClick={() => setItens((atual) => atual.filter((i) => i.key !== item.key))}
                >
                  Remover
                </Button>
              </div>
              {item.insumoId === NOVO && (
                <div className="grid grid-cols-[1fr_8rem] gap-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Nome do insumo novo</Label>
                    <Input value={item.novoNome} onChange={(e) => mudar(item.key, { novoNome: e.target.value })} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Unidade</Label>
                    <Select
                      value={item.novaUnidade}
                      onValueChange={(v) => mudar(item.key, { novaUnidade: v as UnidadeInsumo })}
                      items={Object.fromEntries(UNIDADES_INSUMO.map((u) => [u, TEXTO_UNIDADE[u]]))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIDADES_INSUMO.map((u) => (
                          <SelectItem key={u} value={u}>
                            {TEXTO_UNIDADE[u]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {custo > 0 && (
                <p className="text-xs text-muted-foreground">
                  Custo: {formatBRL(custo)} por {un}
                </p>
              )}
            </div>
          );
        })}
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => setItens((atual) => [...atual, itemVazio()])}>
            + Item
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="obs">Observação (opcional)</Label>
        <Input id="obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      </div>

      <DialogFooter className="items-center sm:justify-between">
        <span className="text-sm">
          Total da NF: <span className="font-medium">{formatBRL(totalNota)}</span>
        </span>
        <Button type="submit" disabled={loading}>
          {loading ? "Lançando..." : "Lançar NF e dar entrada"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ComprasManager({
  compras,
  fornecedores,
  insumos,
}: {
  compras: Compra[];
  fornecedores: Fornecedor[];
  insumos: Insumo[];
}) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<RascunhoNFe | null>(null);
  const [lendo, setLendo] = useState(false);
  const inputXml = useRef<HTMLInputElement>(null);

  function abrir(r: RascunhoNFe | null) {
    setRascunho(r);
    setAberto(true);
  }

  async function handleXml(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setLendo(true);
    try {
      const form = new FormData();
      form.set("arquivo", arquivo);
      abrir(await lerXmlCompra(form));
    } catch (err) {
      erro(err);
    } finally {
      setLendo(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        <input ref={inputXml} type="file" accept=".xml,text/xml,application/xml" className="hidden" onChange={handleXml} />
        <Button variant="outline" disabled={lendo} onClick={() => inputXml.current?.click()}>
          {lendo ? "Lendo XML..." : "Importar XML da NF"}
        </Button>
        <Button onClick={() => abrir(null)}>Digitar NF</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Emissão</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>NF</TableHead>
            <TableHead>Itens</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Origem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {compras.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhuma NF de compra lançada.
              </TableCell>
            </TableRow>
          )}
          {compras.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{formatData(c.emitidaEm)}</TableCell>
              <TableCell>{c.fornecedor}</TableCell>
              <TableCell>
                {c.numero}
                {c.serie ? `/${c.serie}` : ""}
              </TableCell>
              <TableCell>{c.itens}</TableCell>
              <TableCell>{formatBRL(Number(c.total))}</TableCell>
              <TableCell>
                <Badge variant={c.origem === "XML" ? "default" : "outline"}>{c.origem === "XML" ? "XML" : "Digitada"}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{rascunho ? "Conferir NF importada" : "Nova NF de compra"}</DialogTitle>
          </DialogHeader>
          {aberto && (
            <CompraForm
              key={rascunho?.chave || "manual"}
              fornecedores={fornecedores}
              insumos={insumos}
              rascunho={rascunho}
              onDone={() => setAberto(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
