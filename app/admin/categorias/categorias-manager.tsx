"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { crearCategoria, editarCategoria } from "./actions";

type Categoria = { id: string; nombre: string; icono: string | null };

function CategoriaForm({
  categoria,
  onDone,
}: {
  categoria?: Categoria;
  onDone: () => void;
}) {
  const [nombre, setNombre] = useState(categoria?.nombre ?? "");
  const [icono, setIcono] = useState(categoria?.icono ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (categoria) {
        await editarCategoria(categoria.id, { nombre, icono });
        toast.success("Categoría actualizada");
      } else {
        await crearCategoria({ nombre, icono });
        toast.success("Categoría creada");
      }
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="icono">Ícono (emoji, opcional)</Label>
        <Input id="icono" value={icono} onChange={(e) => setIcono(e.target.value)} placeholder="🍞" />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CategoriasManager({ categorias }: { categorias: Categoria[] }) {
  const [openNueva, setOpenNueva] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={openNueva} onOpenChange={setOpenNueva}>
          <DialogTrigger render={<Button />}>Nueva categoría</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva categoría</DialogTitle>
            </DialogHeader>
            <CategoriaForm onDone={() => setOpenNueva(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ícono</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categorias.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.icono}</TableCell>
              <TableCell>{c.nombre}</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => setEditando(c)}>
                  Editar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoría</DialogTitle>
          </DialogHeader>
          {editando && <CategoriaForm categoria={editando} onDone={() => setEditando(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
