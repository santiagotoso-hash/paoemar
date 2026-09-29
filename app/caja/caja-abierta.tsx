"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { ResumenCaja } from "@/lib/caja";
import { registrarMovimiento, cerrarCaja } from "./actions";

const METODO_PAGO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA_CREDITO: "Tarjeta de crédito",
  TARJETA_DEBITO: "Tarjeta de débito",
  TRANSFERENCIA: "Transferencia",
};

type Sesion = { id: string; fondoInicial: string; abiertaEn: string };

function MovimientoForm({ onDone }: { onDone: () => void }) {
  const [tipo, setTipo] = useState<"SANGRIA" | "SUMINISTRO">("SANGRIA");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await registrarMovimiento({ tipo, monto, descripcion: descripcion || undefined });
      toast.success("Movimiento registrado");
      setMonto("");
      setDescripcion("");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar movimiento");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-col gap-1.5">
        <Label>Tipo</Label>
        <Select
          value={tipo}
          onValueChange={(v) => setTipo(v as "SANGRIA" | "SUMINISTRO")}
          items={{ SANGRIA: "Sangría (retiro)", SUMINISTRO: "Suministro (ingreso)" }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SANGRIA">Sangría (retiro)</SelectItem>
            <SelectItem value="SUMINISTRO">Suministro (ingreso)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="monto">Monto</Label>
        <Input
          id="monto"
          type="number"
          step="0.01"
          min="0"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          required
          className="w-32"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="descripcion">Descripción (opcional)</Label>
        <Input id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "..." : "Registrar"}
      </Button>
    </form>
  );
}

function CerrarCajaDialog({ resumen }: { resumen: ResumenCaja }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirmar() {
    setLoading(true);
    try {
      await cerrarCaja();
      toast.success("Caja cerrada");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cerrar caja");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>Cerrar caja</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar cierre de caja</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 text-sm">
          <p>Ventas totales: <span className="font-medium">${resumen.totalVentas.toFixed(2)}</span></p>
          <p>Sangrías: <span className="font-medium">-${resumen.sangrias.toFixed(2)}</span></p>
          <p>Suministros: <span className="font-medium">+${resumen.suministros.toFixed(2)}</span></p>
          <p className="border-t pt-2 text-base font-semibold">
            Efectivo esperado en caja: ${resumen.efectivoEsperado.toFixed(2)}
          </p>
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={handleConfirmar} disabled={loading}>
            {loading ? "Cerrando..." : "Confirmar cierre"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CajaAbierta({ sesion, resumen }: { sesion: Sesion; resumen: ResumenCaja }) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Caja abierta</h1>
          <p className="text-sm text-muted-foreground">
            Desde {new Date(sesion.abiertaEn).toLocaleString("es-AR")} — fondo inicial $
            {Number(sesion.fondoInicial).toFixed(2)}
          </p>
        </div>
        <CerrarCajaDialog resumen={resumen} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {resumen.ventasPorMetodo.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay ventas en esta caja.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {resumen.ventasPorMetodo.map((v) => (
                <li key={v.metodoPago} className="flex justify-between">
                  <span>{METODO_PAGO_LABEL[v.metodoPago] ?? v.metodoPago}</span>
                  <span className="font-medium">${v.total.toFixed(2)} ({v.cantidad})</span>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t pt-2 text-sm">
            <p className="flex justify-between"><span>Total ventas</span><span>${resumen.totalVentas.toFixed(2)}</span></p>
            <p className="flex justify-between"><span>Sangrías</span><span>-${resumen.sangrias.toFixed(2)}</span></p>
            <p className="flex justify-between"><span>Suministros</span><span>+${resumen.suministros.toFixed(2)}</span></p>
            <p className="flex justify-between font-semibold"><span>Efectivo esperado</span><span>${resumen.efectivoEsperado.toFixed(2)}</span></p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos de caja</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <MovimientoForm onDone={() => router.refresh()} />
          {resumen.movimientos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin movimientos todavía.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumen.movimientos.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.tipo === "SANGRIA" ? "Sangría" : "Suministro"}</TableCell>
                    <TableCell>${Number(m.monto).toFixed(2)}</TableCell>
                    <TableCell>{m.descripcion ?? "—"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(m.createdAt).toLocaleTimeString("es-AR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
