"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatBRL } from "@/lib/format";
import type { BandeiraValue, MetodoPagoValue } from "@/lib/metodos-pago";
import { FormaPagamento, pagamentoCompleto } from "@/components/forma-pagamento";
import { agregarItemComanda, eliminarItemComanda, cerrarComanda } from "../actions";

type Comanda = {
  id: string;
  codigo: string;
  nombreCliente: string | null;
  estado: "ABIERTA" | "CERRADA";
};

type Item = {
  id: string;
  productoNombre: string;
  cantidad: string;
  precioUnit: string;
  notas: string | null;
};

type Producto = { id: string; nombre: string; precio: string; tipoUnidad: "UNIDAD" | "KG" };


function AgregarItemForm({ comandaId, productos }: { comandaId: string; productos: Producto[] }) {
  const router = useRouter();
  const [productoId, setProductoId] = useState(productos[0]?.id ?? "");
  const [cantidad, setCantidad] = useState("1");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await agregarItemComanda(comandaId, { productoId, cantidad, notas: notas || undefined });
      setCantidad("1");
      setNotas("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar o item");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <Label>Produto</Label>
        <Select
          value={productoId}
          onValueChange={(v) => setProductoId(v as string)}
          items={productos.map((p) => ({ value: p.id, label: `${p.nombre} — ${formatBRL(Number(p.precio))}` }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {productos.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nombre} — {formatBRL(Number(p.precio))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cantidad">Quantidade</Label>
        <Input
          id="cantidad"
          type="number"
          min="0"
          step={productos.find((p) => p.id === productoId)?.tipoUnidad === "KG" ? "0.1" : "1"}
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className="w-24"
          required
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="notas">Observação (opcional)</Label>
        <Input id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="sem açúcar..." />
      </div>
      <Button type="submit" disabled={loading || !productoId}>
        {loading ? "..." : "Adicionar"}
      </Button>
    </form>
  );
}

function CerrarComandaDialog({ comandaId, total }: { comandaId: string; total: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [metodoPago, setMetodoPago] = useState<MetodoPagoValue>("EFECTIVO");
  const [bandeira, setBandeira] = useState<BandeiraValue | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleConfirmar() {
    setLoading(true);
    try {
      await cerrarComanda(comandaId, { metodoPago, bandeira });
      toast.success("Comanda fechada e convertida em venda");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao fechar a comanda");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Fechar comanda</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar comanda</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-lg font-semibold">Total: {formatBRL(total)}</p>
          <div className="flex flex-col gap-1.5">
            <Label>Forma de pagamento</Label>
            <FormaPagamento metodo={metodoPago} onMetodo={setMetodoPago} bandeira={bandeira} onBandeira={setBandeira} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleConfirmar} disabled={loading || !pagamentoCompleto(metodoPago, bandeira)}>
            {loading ? "Fechando..." : "Confirmar e cobrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ComandaDetail({
  comanda,
  items,
  productos,
}: {
  comanda: Comanda;
  items: Item[];
  productos: Producto[];
}) {
  const router = useRouter();
  const abierta = comanda.estado === "ABIERTA";
  const total = items.reduce((acc, i) => acc + Number(i.precioUnit) * Number(i.cantidad), 0);

  async function handleEliminar(itemId: string) {
    try {
      await eliminarItemComanda(comanda.id, itemId);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover o item");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{comanda.codigo}</h1>
          {comanda.nombreCliente && (
            <p className="text-sm text-muted-foreground">{comanda.nombreCliente}</p>
          )}
        </div>
        <Badge variant={abierta ? "default" : "outline"}>
          {abierta ? "Aberta" : "Fechada"}
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>Quantidade</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Observação</TableHead>
            {abierta && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((i) => (
            <TableRow key={i.id}>
              <TableCell>{i.productoNombre}</TableCell>
              <TableCell>{i.cantidad}</TableCell>
              <TableCell>{formatBRL(Number(i.precioUnit))}</TableCell>
              <TableCell>{i.notas ?? "—"}</TableCell>
              {abierta && (
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleEliminar(i.id)}>
                    Remover
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between border-t pt-3 text-lg font-semibold">
        <span>Total</span>
        <span>{formatBRL(total)}</span>
      </div>

      {abierta && (
        <>
          <AgregarItemForm comandaId={comanda.id} productos={productos} />
          <div className="flex justify-end">
            <CerrarComandaDialog comandaId={comanda.id} total={total} />
          </div>
        </>
      )}
    </div>
  );
}
