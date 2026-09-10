"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { crearComanda } from "./actions";

export function NuevaComandaDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const id = await crearComanda({ codigo, nombreCliente: nombreCliente || undefined });
      setOpen(false);
      setCodigo("");
      setNombreCliente("");
      router.push(`/comandas/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear la comanda");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Nueva comanda</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva comanda</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="codigo">Código / mesa</Label>
            <Input
              id="codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Mesa 5"
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombreCliente">Cliente (opcional)</Label>
            <Input
              id="nombreCliente"
              value={nombreCliente}
              onChange={(e) => setNombreCliente(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear y abrir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
