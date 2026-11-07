"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBRL } from "@/lib/format";
import type { BandeiraValue, MetodoPagoValue } from "@/lib/metodos-pago";
import { FormaPagamento, pagamentoCompleto } from "@/components/forma-pagamento";
import { confirmarVentaMostrador } from "./actions";

type Producto = {
  id: string;
  codigo: string;
  nombre: string;
  categoriaId: string;
  precio: string;
  tipoUnidad: "UNIDAD" | "KG";
  stockActual: string;
};

type Categoria = { id: string; nombre: string; icono: string | null };


export function PosManager({
  productos,
  categorias,
}: {
  productos: Producto[];
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [metodoPago, setMetodoPago] = useState<MetodoPagoValue>("EFECTIVO");
  const [bandeira, setBandeira] = useState<BandeiraValue | null>(null);
  const [nombreCliente, setNombreCliente] = useState("");
  const [loading, setLoading] = useState(false);

  function addToCart(producto: Producto) {
    const paso = producto.tipoUnidad === "KG" ? 0.5 : 1;
    setCart((prev) => ({ ...prev, [producto.id]: (prev[producto.id] ?? 0) + paso }));
  }

  function setQty(productoId: string, value: number) {
    setCart((prev) => {
      if (value <= 0) {
        return Object.fromEntries(Object.entries(prev).filter(([id]) => id !== productoId));
      }
      return { ...prev, [productoId]: value };
    });
  }

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([productoId, cantidad]) => {
          const producto = productos.find((p) => p.id === productoId);
          if (!producto) return null;
          const precioUnit = Number(producto.precio);
          return { producto, cantidad, subtotal: precioUnit * cantidad };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [cart, productos]
  );

  const total = cartItems.reduce((acc, item) => acc + item.subtotal, 0);

  async function handleConfirmar() {
    if (cartItems.length === 0) return;
    setLoading(true);
    try {
      const result = await confirmarVentaMostrador({
        items: cartItems.map((i) => ({ productoId: i.producto.id, cantidad: i.cantidad })),
        metodoPago,
        bandeira,
        nombreCliente: nombreCliente || undefined,
      });
      toast.success(`Venda ${result.codigo} confirmada — ${formatBRL(Number(result.total))}`);
      setCart({});
      setNombreCliente("");
      setBandeira(null);
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
            {cartItems.map((item) => (
              <li key={item.producto.id} className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.producto.nombre}</p>
                  <p className="text-xs text-muted-foreground">{formatBRL(item.subtotal)}</p>
                </div>
                <Input
                  type="number"
                  min="0"
                  step={item.producto.tipoUnidad === "KG" ? "0.1" : "1"}
                  value={item.cantidad}
                  onChange={(e) => setQty(item.producto.id, Number(e.target.value))}
                  className="w-20"
                />
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
    </div>
  );
}
