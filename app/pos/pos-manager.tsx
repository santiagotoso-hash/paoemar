"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBRL, VALOR_EMBALAGEM } from "@/lib/format";
import type { BandeiraValue, MetodoPagoValue } from "@/lib/metodos-pago";
import { FormaPagamento, pagamentoCompleto } from "@/components/forma-pagamento";
import { OpcoesSheet } from "../mesas/(salao)/[id]/lancar/opcoes-sheet";
import type { ProdutoMesa } from "../mesas/(salao)/[id]/lancar/lancar-itens";
import { chavePendente, somarPendente, totalPendente, type ItemPendente } from "../mesas/pendentes";
import { confirmarVentaMostrador } from "./actions";

type Producto = {
  id: string;
  codigo: string;
  nombre: string;
  categoriaId: string;
  precio: string;
  tipoUnidad: "UNIDAD" | "KG";
  stockActual: string;
  adicionais: ProdutoMesa["adicionais"];
  grupos: ProdutoMesa["grupos"];
};

type Categoria = { id: string; nombre: string; icono: string | null };

/** Campo de quantidade que tolera ficar vazio enquanto se digita (não remove o item). */
function QtyInput({ value, step, onCommit }: { value: number; step: string; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      type="number"
      inputMode="decimal"
      min="0"
      step={step}
      value={draft ?? String(value)}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value !== "" && n > 0) onCommit(n);
      }}
      onBlur={() => setDraft(null)} // vazio/0 volta à quantidade anterior
      className="w-20"
    />
  );
}

export function PosManager({
  productos,
  categorias,
}: {
  productos: Producto[];
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [cart, setCart] = useState<ItemPendente[]>([]);
  const [produtoAberto, setProdutoAberto] = useState<ProdutoMesa | null>(null);
  const [metodoPago, setMetodoPago] = useState<MetodoPagoValue>("EFECTIVO");
  const [bandeira, setBandeira] = useState<BandeiraValue | null>(null);
  const [nombreCliente, setNombreCliente] = useState("");
  const [embalagem, setEmbalagem] = useState(false);
  const [loading, setLoading] = useState(false);

  function addToCart(producto: Producto) {
    if (producto.adicionais.length > 0 || producto.grupos.length > 0) {
      // Produto com opções/adicionais (ex.: granola no açaí): escolhe numa folha.
      setProdutoAberto({
        id: producto.id,
        nombre: producto.nombre,
        precio: Number(producto.precio),
        categoriaId: producto.categoriaId,
        adicionais: producto.adicionais,
        grupos: producto.grupos,
      });
      return;
    }
    const paso = producto.tipoUnidad === "KG" ? 0.5 : 1;
    setCart((prev) =>
      somarPendente(prev, {
        chave: chavePendente(producto.id, [], []),
        productoId: producto.id,
        nombre: producto.nombre,
        adicionais: [],
        qtd: paso,
        precoUnit: Number(producto.precio),
      })
    );
  }

  function setQty(chave: string, value: number) {
    setCart((prev) =>
      value <= 0 ? prev.filter((i) => i.chave !== chave) : prev.map((i) => (i.chave === chave ? { ...i, qtd: value } : i))
    );
  }

  const cartItems = useMemo(
    () =>
      cart
        .map((item) => {
          const producto = productos.find((p) => p.id === item.productoId);
          return producto ? { item, producto, subtotal: totalPendente(item) } : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [cart, productos]
  );

  const subtotal = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
  const total = subtotal + (embalagem ? VALOR_EMBALAGEM : 0);

  async function handleConfirmar() {
    if (cartItems.length === 0) return;
    setLoading(true);
    try {
      const result = await confirmarVentaMostrador({
        items: cartItems.map(({ item }) => ({
          productoId: item.productoId,
          cantidad: item.qtd,
          opcionIds: item.opcion?.ids ?? [],
          adicionalIds: item.adicionais.map((a) => a.id),
          notas: item.observacao,
        })),
        metodoPago,
        bandeira,
        nombreCliente: nombreCliente || undefined,
        embalagem,
      });
      toast.success(`Venda ${result.codigo} confirmada — ${formatBRL(Number(result.total))}`);
      setCart([]);
      setNombreCliente("");
      setBandeira(null);
      setEmbalagem(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao confirmar a venda");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div>
        <h1 className="mb-4 text-xl font-semibold">Venda no balcão</h1>
        <Tabs defaultValue={categorias[0]?.id}>
          <TabsList className="grid w-full grid-cols-2 gap-2 bg-transparent p-0 group-data-[orientation=horizontal]/tabs:h-auto sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {categorias.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="flex h-auto min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-md border bg-card px-2 py-2 text-center leading-tight whitespace-normal break-words text-card-foreground shadow-sm data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow dark:data-[active]:bg-primary dark:data-[active]:text-primary-foreground"
              >
                {cat.icono} {cat.nombre}
              </TabsTrigger>
            ))}
          </TabsList>
          {categorias.map((cat) => (
            <TabsContent key={cat.id} value={cat.id}>
              <div className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-3">
                {productos
                  .filter((p) => p.categoriaId === cat.id)
                  .map((p) => (
                    <Card
                      key={p.id}
                      className="cursor-pointer transition-colors hover:bg-muted"
                      onClick={() => addToCart(p)}
                    >
                      <CardContent className="flex flex-col gap-1 p-3">
                        <span className="text-sm font-medium">{p.nombre}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatBRL(Number(p.precio))} {p.tipoUnidad === "KG" ? "/ kg" : ""}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <div className="flex h-fit flex-col gap-4 rounded-lg border p-4 lg:order-first">
        <h2 className="font-semibold">Carrinho</h2>

        {cartItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Toque em um produto para adicioná-lo.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {cartItems.map(({ item, producto, subtotal }) => (
              <li key={item.chave} className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{producto.nombre}</p>
                  {(item.opcion || item.adicionais.length > 0 || item.observacao) && (
                    <p className="text-xs text-muted-foreground">
                      {[item.opcion?.nombre, ...item.adicionais.map((a) => `+ ${a.nombre}`)].filter(Boolean).join(" · ")}
                      {item.observacao && <span className="italic"> “{item.observacao}”</span>}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{formatBRL(subtotal)}</p>
                </div>
                <QtyInput
                  value={item.qtd}
                  step={producto.tipoUnidad === "KG" ? "0.1" : "1"}
                  onCommit={(n) => setQty(item.chave, n)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover ${producto.nombre}`}
                  onClick={() => setQty(item.chave, 0)}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nombreCliente">Cliente (opcional)</Label>
          <Input
            id="nombreCliente"
            value={nombreCliente}
            onChange={(e) => setNombreCliente(e.target.value)}
            placeholder="Balcão"
          />
        </div>

        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-5 accent-primary"
              checked={embalagem}
              onChange={(e) => setEmbalagem(e.target.checked)}
            />
            Embalagem
          </span>
          <span className="tabular-nums text-muted-foreground">+ {formatBRL(VALOR_EMBALAGEM)}</span>
        </label>

        <div className="flex flex-col gap-1.5">
          <Label>Forma de pagamento</Label>
          <FormaPagamento metodo={metodoPago} onMetodo={setMetodoPago} bandeira={bandeira} onBandeira={setBandeira} />
        </div>

        <div className="flex items-center justify-between border-t pt-3 text-lg font-semibold">
          <span>Total</span>
          <span>{formatBRL(total)}</span>
        </div>

        <Button
          disabled={cartItems.length === 0 || loading || !pagamentoCompleto(metodoPago, bandeira)}
          onClick={handleConfirmar}
        >
          {loading ? "Confirmando..." : "Confirmar venda"}
        </Button>
      </div>
      <OpcoesSheet
        produto={produtoAberto}
        onClose={() => setProdutoAberto(null)}
        onAdicionar={(item) => {
          setCart((prev) => somarPendente(prev, item));
          setProdutoAberto(null);
        }}
      />
    </div>
  );
}
