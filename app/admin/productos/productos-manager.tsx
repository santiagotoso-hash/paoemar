"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatBRL } from "@/lib/format";
import { dadosEfetivos, faltaFiscal, ORIGENS, TEXTO_ORIGEM } from "@/lib/fiscal";
import { TEXTO_UNIDADE } from "@/lib/estoque";
import type { UnidadeInsumo } from "@prisma/client";
import { crearProducto, editarProducto, salvarReceita, toggleActivoProducto } from "./actions";

type Categoria = {
  id: string;
  nombre: string;
  ncmPadrao: string | null;
  cfopPadrao: string | null;
  csosnPadrao: string | null;
  origemPadrao: number | null;
};

type Insumo = { id: string; nome: string; unidade: UnidadeInsumo; custoMedio: string };

type LinhaReceita = { insumoId: string; quantidade: string };

type Producto = {
  id: string;
  codigo: string;
  nombre: string;
  categoriaId: string;
  precio: string;
  tipoUnidad: "UNIDAD" | "KG";
  descripcion: string | null;
  stockActual: string;
  stockMinimo: string;
  activo: boolean;
  encomendavel: boolean;
  imprimirCozinha: boolean;
  imprimirProducao: boolean;
  imprimirCaixa: boolean;
  ncm: string | null;
  cfop: string | null;
  csosn: string | null;
  origem: number | null;
  receita: LinhaReceita[];
};

/** Ficha técnica: quanto de cada insumo vai em 1 unidade (ou 1 kg) do produto. */
function ReceitaForm({ producto, insumos, onDone }: { producto: Producto; insumos: Insumo[]; onDone: () => void }) {
  const [linhas, setLinhas] = useState<LinhaReceita[]>(producto.receita);
  const [loading, setLoading] = useState(false);

  const insumo = (id: string) => insumos.find((i) => i.id === id);
  const custo = linhas.reduce((acc, l) => acc + (Number(l.quantidade) || 0) * Number(insumo(l.insumoId)?.custoMedio ?? 0), 0);
  const livres = insumos.filter((i) => !linhas.some((l) => l.insumoId === i.id));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (linhas.some((l) => !l.insumoId)) return toast.error("Escolha o insumo de cada linha");
    setLoading(true);
    try {
      await salvarReceita(producto.id, linhas);
      toast.success(linhas.length > 0 ? "Ficha técnica salva" : "Ficha técnica removida");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Com ficha técnica, cada venda baixa estes insumos e o estoque do próprio produto deixa de ser usado.
        Sem linhas, o produto volta a controlar o próprio estoque.
      </p>
      {linhas.map((l, idx) => {
        const un = TEXTO_UNIDADE[insumo(l.insumoId)?.unidade ?? "UN"];
        const opcoes = [...livres, ...insumos.filter((i) => i.id === l.insumoId)];
        return (
          <div key={idx} className="grid grid-cols-[1fr_8rem_auto] items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>Insumo</Label>
              <Select
                value={l.insumoId}
                onValueChange={(v) => setLinhas((a) => a.map((x, i) => (i === idx ? { ...x, insumoId: v as string } : x)))}
                items={opcoes.map((i) => ({ value: i.id, label: i.nome }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha o insumo" />
                </SelectTrigger>
                <SelectContent>
                  {opcoes.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.nome} ({TEXTO_UNIDADE[i.unidade]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Qtd{l.insumoId ? ` (${un})` : ""}</Label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                value={l.quantidade}
                onChange={(e) => setLinhas((a) => a.map((x, i) => (i === idx ? { ...x, quantidade: e.target.value } : x)))}
                required
              />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setLinhas((a) => a.filter((_, i) => i !== idx))}>
              Remover
            </Button>
          </div>
        );
      })}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={livres.length === 0}
          onClick={() => setLinhas((a) => [...a, { insumoId: "", quantidade: "" }])}
        >
          + Insumo
        </Button>
      </div>
      {linhas.length > 0 && (
        <p className="text-sm">
          Custo estimado: <span className="font-medium">{formatBRL(custo)}</span> · preço {formatBRL(Number(producto.precio))}
        </p>
      )}
      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar ficha"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ProductoForm({
  producto,
  categorias,
  onDone,
}: {
  producto?: Producto;
  categorias: Categoria[];
  onDone: () => void;
}) {
  const [codigo, setCodigo] = useState(producto?.codigo ?? "");
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [categoriaId, setCategoriaId] = useState(producto?.categoriaId ?? categorias[0]?.id ?? "");
  const [precio, setPrecio] = useState(producto?.precio ?? "");
  const [tipoUnidad, setTipoUnidad] = useState<"UNIDAD" | "KG">(producto?.tipoUnidad ?? "UNIDAD");
  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? "");
  const [stockActual, setStockActual] = useState(producto?.stockActual ?? "0");
  const [stockMinimo, setStockMinimo] = useState(producto?.stockMinimo ?? "5");
  const [encomendavel, setEncomendavel] = useState(producto?.encomendavel ?? false);
  const [imprimirCozinha, setImprimirCozinha] = useState(producto?.imprimirCozinha ?? false);
  const [imprimirProducao, setImprimirProducao] = useState(producto?.imprimirProducao ?? false);
  const [imprimirCaixa, setImprimirCaixa] = useState(producto?.imprimirCaixa ?? false);
  const [ncm, setNcm] = useState(producto?.ncm ?? "");
  const [cfop, setCfop] = useState(producto?.cfop ?? "");
  const [csosn, setCsosn] = useState(producto?.csosn ?? "");
  const [origem, setOrigem] = useState<number | null>(producto?.origem ?? null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload = { codigo, nombre, categoriaId, precio, tipoUnidad, descripcion, stockActual, stockMinimo, encomendavel, imprimirCozinha, imprimirProducao, imprimirCaixa, ncm, cfop, csosn, origem };
    try {
      if (producto) {
        await editarProducto(producto.id, payload);
        toast.success("Produto atualizado");
      } else {
        await crearProducto(payload);
        toast.success("Produto criado");
      }
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="codigo">Código</Label>
          <Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nombre">Nome</Label>
          <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Categoria</Label>
          <Select
            value={categoriaId}
            onValueChange={(v) => setCategoriaId(v as string)}
            items={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Escolha uma categoria" />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Tipo de unidade</Label>
          <Select
            value={tipoUnidad}
            onValueChange={(v) => setTipoUnidad(v as "UNIDAD" | "KG")}
            items={{ UNIDAD: "Unidade", KG: "Kg" }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UNIDAD">Unidade</SelectItem>
              <SelectItem value="KG">Kg</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="precio">Preço</Label>
          <Input id="precio" type="number" step="0.01" min="0" value={precio} onChange={(e) => setPrecio(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stockActual">Estoque atual</Label>
          <Input id="stockActual" type="number" step="0.01" min="0" value={stockActual} onChange={(e) => setStockActual(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stockMinimo">Estoque mínimo</Label>
          <Input id="stockMinimo" type="number" step="0.01" min="0" value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="descripcion">Descrição (opcional)</Label>
        <Textarea id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </div>

      <label htmlFor="encomendavel" className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          id="encomendavel"
          type="checkbox"
          checked={encomendavel}
          onChange={(e) => setEncomendavel(e.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          Pode ser encomendado
          <span className="block text-xs text-muted-foreground">
            O produto aparece na lista da tela de Encomendas e vai para a Fábrica.
          </span>
        </span>
      </label>

      <details className="rounded-xl border p-3 text-sm" open={!!(ncm || cfop || csosn || origem !== null)}>
        <summary className="cursor-pointer font-medium">Dados fiscais (opcional)</summary>
        <p className="mt-2 text-xs text-muted-foreground">
          Deixe em branco para usar o padrão da categoria (Admin → Fiscal). Preencha só se este produto for diferente.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ncm">NCM</Label>
            <Input id="ncm" inputMode="numeric" value={ncm} onChange={(e) => setNcm(e.target.value)} placeholder="0000.00.00" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cfop">CFOP</Label>
            <Input id="cfop" inputMode="numeric" value={cfop} onChange={(e) => setCfop(e.target.value)} placeholder="5102" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="csosn">CSOSN</Label>
            <Input id="csosn" inputMode="numeric" value={csosn} onChange={(e) => setCsosn(e.target.value)} placeholder="102" />
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-1.5">
          <Label>Origem</Label>
          <Select
            value={origem === null ? "" : String(origem)}
            onValueChange={(v) => setOrigem(v === "" || v === null ? null : Number(v))}
            items={Object.fromEntries(ORIGENS.map((o) => [String(o), TEXTO_ORIGEM[o]]))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Usar a da categoria" />
            </SelectTrigger>
            <SelectContent>
              {ORIGENS.map((o) => (
                <SelectItem key={o} value={String(o)}>
                  {TEXTO_ORIGEM[o]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </details>

      <label htmlFor="imprimirCozinha" className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          id="imprimirCozinha"
          type="checkbox"
          checked={imprimirCozinha}
          onChange={(e) => setImprimirCozinha(e.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          Imprimir na cozinha
          <span className="block text-xs text-muted-foreground">
            O produto sai na impressora da cozinha quando for pedido.
          </span>
        </span>
      </label>

      <label htmlFor="imprimirProducao" className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          id="imprimirProducao"
          type="checkbox"
          checked={imprimirProducao}
          onChange={(e) => setImprimirProducao(e.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          Imprimir em produção
          <span className="block text-xs text-muted-foreground">
            O produto sai na impressora da produção (Fábrica), que é outra impressora.
          </span>
        </span>
      </label>

      <label htmlFor="imprimirCaixa" className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          id="imprimirCaixa"
          type="checkbox"
          checked={imprimirCaixa}
          onChange={(e) => setImprimirCaixa(e.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          Imprimir no caixa
          <span className="block text-xs text-muted-foreground">
            O produto sai na impressora do caixa quando for pedido.
          </span>
        </span>
      </label>

      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ProductosManager({
  productos,
  categorias,
  insumos,
}: {
  productos: Producto[];
  categorias: Categoria[];
  insumos: Insumo[];
}) {
  const [openNuevo, setOpenNuevo] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [fichaDe, setFichaDe] = useState<Producto | null>(null);

  async function handleToggle(p: Producto) {
    try {
      await toggleActivoProducto(p.id, !p.activo);
      toast.success(p.activo ? "Produto desativado" : "Produto ativado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  const categoriaNombre = (id: string) => categorias.find((c) => c.id === id)?.nombre ?? "—";

  /** Falta NCM, CFOP, CSOSN ou origem (considerando o padrão da categoria). */
  function fiscalIncompleto(p: Producto) {
    const c = categorias.find((x) => x.id === p.categoriaId);
    const padrao = { ncm: c?.ncmPadrao ?? null, cfop: c?.cfopPadrao ?? null, csosn: c?.csosnPadrao ?? null, origem: c?.origemPadrao ?? null };
    return faltaFiscal(dadosEfetivos(p, padrao)).length > 0;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={openNuevo} onOpenChange={setOpenNuevo}>
          <DialogTrigger render={<Button />}>Novo produto</DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo produto</DialogTitle>
            </DialogHeader>
            <ProductoForm categorias={categorias} onDone={() => setOpenNuevo(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Estoque</TableHead>
            <TableHead>Encomenda</TableHead>
            <TableHead>Cozinha</TableHead>
            <TableHead>Produção</TableHead>
            <TableHead>Caixa</TableHead>
            <TableHead>Fiscal</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos.map((p) => {
            const comFicha = p.receita.length > 0;
            const bajoStock = !comFicha && Number(p.stockActual) <= Number(p.stockMinimo);
            return (
              <TableRow key={p.id}>
                <TableCell>{p.codigo}</TableCell>
                <TableCell>{p.nombre}</TableCell>
                <TableCell>{categoriaNombre(p.categoriaId)}</TableCell>
                <TableCell>{formatBRL(Number(p.precio))}</TableCell>
                <TableCell>
                  {comFicha ? (
                    <span className="text-muted-foreground">Pela ficha técnica</span>
                  ) : (
                    <span className={bajoStock ? "font-medium text-destructive" : ""}>
                      {p.stockActual} {p.tipoUnidad === "KG" ? "kg" : "un."}
                    </span>
                  )}
                </TableCell>
                <TableCell>{p.encomendavel ? "Sim" : ""}</TableCell>
                <TableCell>{p.imprimirCozinha ? "Sim" : ""}</TableCell>
                <TableCell>{p.imprimirProducao ? "Sim" : ""}</TableCell>
                <TableCell>{p.imprimirCaixa ? "Sim" : ""}</TableCell>
                <TableCell>{fiscalIncompleto(p) ? <Badge variant="outline">Incompleto</Badge> : ""}</TableCell>
                <TableCell>
                  <Badge variant={p.activo ? "default" : "outline"}>
                    {p.activo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setFichaDe(p)}>
                    Ficha técnica
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditando(p)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggle(p)}>
                    {p.activo ? "Desativar" : "Ativar"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={!!fichaDe} onOpenChange={(open) => !open && setFichaDe(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ficha técnica — {fichaDe?.nombre}</DialogTitle>
          </DialogHeader>
          {fichaDe && <ReceitaForm producto={fichaDe} insumos={insumos} onDone={() => setFichaDe(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar produto</DialogTitle>
          </DialogHeader>
          {editando && (
            <ProductoForm producto={editando} categorias={categorias} onDone={() => setEditando(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
