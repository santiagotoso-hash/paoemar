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
import { formatBRL } from "@/lib/format";
import { METODO_PAGO_LABEL } from "@/lib/metodos-pago";
import { registrarMovimiento, cerrarCaja } from "./actions";


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
      toast.success("Movimentação registrada");
      setMonto("");
      setDescripcion("");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar a movimentação");
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
          items={{ SANGRIA: "Sangria (retirada)", SUMINISTRO: "Suprimento (entrada)" }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SANGRIA">Sangria (retirada)</SelectItem>
            <SelectItem value="SUMINISTRO">Suprimento (entrada)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="monto">Valor</Label>
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
        <Label htmlFor="descripcion">Descrição (opcional)</Label>
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
      toast.success("Caixa fechado");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao fechar o caixa");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>Fechar caixa</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar fechamento do caixa</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 text-sm">
          <p>Vendas totais: <span className="font-medium">{formatBRL(resumen.totalVentas)}</span></p>
          <p>Sangrias: <span className="font-medium">-{formatBRL(resumen.sangrias)}</span></p>
          <p>Suprimentos: <span className="font-medium">+{formatBRL(resumen.suministros)}</span></p>
          <p className="border-t pt-2 text-base font-semibold">
            Dinheiro esperado no caixa: {formatBRL(resumen.efectivoEsperado)}
          </p>
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={handleConfirmar} disabled={loading}>
            {loading ? "Fechando..." : "Confirmar fechamento"}
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
          <h1 className="text-xl font-semibold">Caixa aberto</h1>
          <p className="text-sm text-muted-foreground">
            Desde {new Date(sesion.abiertaEn).toLocaleString("pt-BR")} — fundo de troco{" "}
            {formatBRL(Number(sesion.fondoInicial))}
          </p>
        </div>
        <CerrarCajaDialog resumen={resumen} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {resumen.ventasPorMetodo.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há vendas neste caixa.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {resumen.ventasPorMetodo.map((v) => (
                <li key={v.metodoPago} className="flex justify-between">
                  <span>{METODO_PAGO_LABEL[v.metodoPago] ?? v.metodoPago}</span>
                  <span className="font-medium">{formatBRL(v.total)} ({v.cantidad})</span>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t pt-2 text-sm">
            <p className="flex justify-between"><span>Total de vendas</span><span>{formatBRL(resumen.totalVentas)}</span></p>
            <p className="flex justify-between"><span>Sangrias</span><span>-{formatBRL(resumen.sangrias)}</span></p>
            <p className="flex justify-between"><span>Suprimentos</span><span>+{formatBRL(resumen.suministros)}</span></p>
            <p className="flex justify-between font-semibold"><span>Dinheiro esperado</span><span>{formatBRL(resumen.efectivoEsperado)}</span></p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimentações do caixa</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <MovimientoForm onDone={() => router.refresh()} />
          {resumen.movimientos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma movimentação ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumen.movimientos.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.tipo === "SANGRIA" ? "Sangria" : "Suprimento"}</TableCell>
                    <TableCell>{formatBRL(Number(m.monto))}</TableCell>
                    <TableCell>{m.descripcion ?? "—"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
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
