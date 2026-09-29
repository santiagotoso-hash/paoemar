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
import { crearProducto, editarProducto, toggleActivoProducto } from "./actions";

type Categoria = { id: string; nombre: string };

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
};

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
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload = { codigo, nombre, categoriaId, precio, tipoUnidad, descripcion, stockActual, stockMinimo };
    try {
      if (producto) {
        await editarProducto(producto.id, payload);
        toast.success("Producto actualizado");
      } else {
        await crearProducto(payload);
        toast.success("Producto creado");
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
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="codigo">Código</Label>
          <Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Categoría</Label>
          <Select
            value={categoriaId}
            onValueChange={(v) => setCategoriaId(v as string)}
            items={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Elegí una categoría" />
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
          <Label>Tipo de unidad</Label>
          <Select
            value={tipoUnidad}
            onValueChange={(v) => setTipoUnidad(v as "UNIDAD" | "KG")}
            items={{ UNIDAD: "Unidad", KG: "Kg" }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UNIDAD">Unidad</SelectItem>
              <SelectItem value="KG">Kg</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="precio">Precio</Label>
          <Input id="precio" type="number" step="0.01" min="0" value={precio} onChange={(e) => setPrecio(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stockActual">Stock actual</Label>
          <Input id="stockActual" type="number" step="0.01" min="0" value={stockActual} onChange={(e) => setStockActual(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stockMinimo">Stock mínimo</Label>
          <Input id="stockMinimo" type="number" step="0.01" min="0" value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="descripcion">Descripción (opcional)</Label>
        <Textarea id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ProductosManager({
  productos,
  categorias,
}: {
  productos: Producto[];
  categorias: Categoria[];
}) {
  const [openNuevo, setOpenNuevo] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);

  async function handleToggle(p: Producto) {
    try {
      await toggleActivoProducto(p.id, !p.activo);
      toast.success(p.activo ? "Producto desactivado" : "Producto activado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  const categoriaNombre = (id: string) => categorias.find((c) => c.id === id)?.nombre ?? "—";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={openNuevo} onOpenChange={setOpenNuevo}>
          <DialogTrigger render={<Button />}>Nuevo producto</DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo producto</DialogTitle>
            </DialogHeader>
            <ProductoForm categorias={categorias} onDone={() => setOpenNuevo(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos.map((p) => {
            const bajoStock = Number(p.stockActual) <= Number(p.stockMinimo);
            return (
              <TableRow key={p.id}>
                <TableCell>{p.codigo}</TableCell>
                <TableCell>{p.nombre}</TableCell>
                <TableCell>{categoriaNombre(p.categoriaId)}</TableCell>
                <TableCell>${Number(p.precio).toFixed(2)}</TableCell>
                <TableCell>
                  <span className={bajoStock ? "font-medium text-destructive" : ""}>
                    {p.stockActual} {p.tipoUnidad === "KG" ? "kg" : "u."}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={p.activo ? "default" : "outline"}>
                    {p.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditando(p)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggle(p)}>
                    {p.activo ? "Desactivar" : "Activar"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
          </DialogHeader>
          {editando && (
            <ProductoForm producto={editando} categorias={categorias} onDone={() => setEditando(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
