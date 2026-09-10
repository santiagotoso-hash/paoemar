"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const METODOS_PAGO = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TARJETA_CREDITO", label: "Tarjeta de crédito" },
  { value: "TARJETA_DEBITO", label: "Tarjeta de débito" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
] as const;

export function PosManager({
  productos,
  categorias,
}: {
  productos: Producto[];
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [metodoPago, setMetodoPago] = useState<(typeof METODOS_PAGO)[number]["value"]>("EFECTIVO");
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
        nombreCliente: nombreCliente || undefined,
      });
      toast.success(`Venta ${result.codigo} confirmada — $${Number(result.total).toFixed(2)}`);
      setCart({});
      setNombreCliente("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al confirmar la venta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="mb-4 text-xl font-semibold">Venta de mostrador</h1>
        <Tabs defaultValue={categorias[0]?.id}>
          <TabsList>
            {categorias.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>
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
                          ${Number(p.precio).toFixed(2)} {p.tipoUnidad === "KG" ? "/ kg" : ""}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <div className="flex h-fit flex-col gap-4 rounded-lg border p-4">
        <h2 className="font-semibold">Carrito</h2>

        {cartItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tocá un producto para agregarlo.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {cartItems.map((item) => (
              <li key={item.producto.id} className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.producto.nombre}</p>
                  <p className="text-xs text-muted-foreground">${item.subtotal.toFixed(2)}</p>
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
            placeholder="Mostrador"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Método de pago</Label>
          <Select value={metodoPago} onValueChange={(v) => setMetodoPago(v as typeof metodoPago)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METODOS_PAGO.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between border-t pt-3 text-lg font-semibold">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>

        <Button disabled={cartItems.length === 0 || loading} onClick={handleConfirmar}>
          {loading ? "Confirmando..." : "Confirmar venta"}
        </Button>
      </div>
    </div>
  );
}
