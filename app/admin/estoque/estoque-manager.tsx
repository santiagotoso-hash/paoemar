"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatBRL, formatDataHora } from "@/lib/format";
import { ROTULO_MOVIMENTO, TEXTO_UNIDADE, UNIDADES_INSUMO } from "@/lib/estoque";
import type { TipoMovimentoEstoque, UnidadeInsumo } from "@prisma/client";
import { criarInsumo, editarInsumo, movimentarInsumo, toggleAtivoInsumo } from "./actions";

type Insumo = {
  id: string;
  nome: string;
  unidade: UnidadeInsumo;
  estoqueAtual: string;
  estoqueMinimo: string;
  custoMedio: string;
  ativo: boolean;
};

type Movimento = {
  id: string;
  insumo: string;
  unidade: UnidadeInsumo;
  tipo: TipoMovimentoEstoque;
  quantidade: string;
  saldoApos: string;
  motivo: string | null;
  criadoEm: string;
};

const erro = (err: unknown) => toast.error(err instanceof Error ? err.message : "Erro ao salvar");

function InsumoForm({ insumo, onDone }: { insumo?: Insumo; onDone: () => void }) {
  const [nome, setNome] = useState(insumo?.nome ?? "");
  const [unidade, setUnidade] = useState<UnidadeInsumo>(insumo?.unidade ?? "KG");
  const [estoqueMinimo, setEstoqueMinimo] = useState(insumo?.estoqueMinimo ?? "0");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { nome, unidade, estoqueMinimo };
      if (insumo) await editarInsumo(insumo.id, payload);
      else await criarInsumo(payload);
      toast.success(insumo ? "Insumo atualizado" : "Insumo criado");
      onDone();
    } catch (err) {
      erro(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Unidade de estoque</Label>
          <Select
            value={unidade}
            onValueChange={(v) => setUnidade(v as UnidadeInsumo)}
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="minimo">Estoque mínimo</Label>
          <Input id="minimo" type="number" step="0.001" min="0" value={estoqueMinimo} onChange={(e) => setEstoqueMinimo(e.target.value)} required />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        A ficha técnica dos produtos usa esta mesma unidade (ex.: 0,15 kg de queijo por unidade).
      </p>
      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type TipoManual = "ENTRADA_MANUAL" | "PERDA" | "AJUSTE";

function MovimentoForm({ insumo, onDone }: { insumo: Insumo; onDone: () => void }) {
  const [tipo, setTipo] = useState<TipoManual>("ENTRADA_MANUAL");
  const [quantidade, setQuantidade] = useState("");
  const [custoUnit, setCustoUnit] = useState("");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const un = TEXTO_UNIDADE[insumo.unidade];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (tipo === "ENTRADA_MANUAL") {
        await movimentarInsumo(insumo.id, {
          tipo,
          quantidade,
          custoUnit: custoUnit === "" ? undefined : custoUnit,
          motivo,
        });
      } else if (tipo === "PERDA") {
        await movimentarInsumo(insumo.id, { tipo, quantidade, motivo });
      } else {
        await movimentarInsumo(insumo.id, { tipo, saldoContado: quantidade, motivo });
      }
      toast.success("Movimento registrado");
      onDone();
    } catch (err) {
      erro(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Saldo atual: <span className="font-medium text-foreground">{insumo.estoqueAtual} {un}</span>
      </p>
      <div className="flex flex-col gap-1.5">
        <Label>Tipo</Label>
        <Select
          value={tipo}
          onValueChange={(v) => setTipo(v as TipoManual)}
          items={{ ENTRADA_MANUAL: "Entrada", PERDA: "Perda / quebra", AJUSTE: "Ajuste de inventário" }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ENTRADA_MANUAL">Entrada</SelectItem>
            <SelectItem value="PERDA">Perda / quebra</SelectItem>
            <SelectItem value="AJUSTE">Ajuste de inventário</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="qtd">{tipo === "AJUSTE" ? `Saldo contado (${un})` : `Quantidade (${un})`}</Label>
          <Input id="qtd" type="number" step="0.001" min={tipo === "AJUSTE" ? undefined : "0"} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required />
        </div>
        {tipo === "ENTRADA_MANUAL" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="custo">Custo por {un} (opcional)</Label>
            <Input id="custo" type="number" step="0.0001" min="0" value={custoUnit} onChange={(e) => setCustoUnit(e.target.value)} />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="motivo">Motivo{tipo === "ENTRADA_MANUAL" ? " (opcional)" : ""}</Label>
        <Input id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} required={tipo !== "ENTRADA_MANUAL"} />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Registrar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EstoqueManager({ insumos, movimentos }: { insumos: Insumo[]; movimentos: Movimento[] }) {
  const [openNovo, setOpenNovo] = useState(false);
  const [editando, setEditando] = useState<Insumo | null>(null);
  const [movimentando, setMovimentando] = useState<Insumo | null>(null);

  async function handleToggle(i: Insumo) {
    try {
      await toggleAtivoInsumo(i.id, !i.ativo);
      toast.success(i.ativo ? "Insumo desativado" : "Insumo ativado");
    } catch (err) {
      erro(err);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Insumos</h2>
          <Dialog open={openNovo} onOpenChange={setOpenNovo}>
            <DialogTrigger render={<Button />}>Novo insumo</DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Novo insumo</DialogTitle>
              </DialogHeader>
              <InsumoForm onDone={() => setOpenNovo(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Insumo</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>Mínimo</TableHead>
              <TableHead>Custo médio</TableHead>
              <TableHead>Valor em estoque</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {insumos.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhum insumo cadastrado ainda.
                </TableCell>
              </TableRow>
            )}
            {insumos.map((i) => {
              const un = TEXTO_UNIDADE[i.unidade];
              const baixo = Number(i.estoqueAtual) <= Number(i.estoqueMinimo);
              return (
                <TableRow key={i.id}>
                  <TableCell>{i.nome}</TableCell>
                  <TableCell>
                    <span className={baixo ? "font-medium text-destructive" : ""}>
                      {i.estoqueAtual} {un}
                    </span>
                  </TableCell>
                  <TableCell>
                    {i.estoqueMinimo} {un}
                  </TableCell>
                  <TableCell>{formatBRL(Number(i.custoMedio))}/{un}</TableCell>
                  <TableCell>{formatBRL(Math.max(0, Number(i.estoqueAtual)) * Number(i.custoMedio))}</TableCell>
                  <TableCell>
                    <Badge variant={i.ativo ? "default" : "outline"}>{i.ativo ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setMovimentando(i)}>
                      Movimentar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditando(i)}>
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggle(i)}>
                      {i.ativo ? "Desativar" : "Ativar"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-semibold">Últimos movimentos</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Insumo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Saldo após</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimentos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Sem movimentos.
                </TableCell>
              </TableRow>
            )}
            {movimentos.map((m) => {
              const un = TEXTO_UNIDADE[m.unidade];
              const entrada = Number(m.quantidade) > 0;
              return (
                <TableRow key={m.id}>
                  <TableCell>{formatDataHora(m.criadoEm)}</TableCell>
                  <TableCell>{m.insumo}</TableCell>
                  <TableCell>{ROTULO_MOVIMENTO[m.tipo]}</TableCell>
                  <TableCell className={entrada ? "text-emerald-600" : "text-destructive"}>
                    {entrada ? "+" : ""}
                    {m.quantidade} {un}
                  </TableCell>
                  <TableCell>
                    {m.saldoApos} {un}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.motivo ?? "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar insumo</DialogTitle>
          </DialogHeader>
          {editando && <InsumoForm insumo={editando} onDone={() => setEditando(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!movimentando} onOpenChange={(open) => !open && setMovimentando(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Movimentar {movimentando?.nome}</DialogTitle>
          </DialogHeader>
          {movimentando && <MovimentoForm insumo={movimentando} onDone={() => setMovimentando(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
