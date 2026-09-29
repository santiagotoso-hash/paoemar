"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { alternarAtendenteActivo, crearAtendente, editarAtendente } from "./actions";

type Atendente = { id: string; nombre: string; activo: boolean };

function AtendenteForm({
  atendente,
  onDone,
}: {
  atendente?: Atendente;
  onDone: () => void;
}) {
  const [nombre, setNombre] = useState(atendente?.nombre ?? "");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (atendente) {
        await editarAtendente(atendente.id, { nombre, pin });
        toast.success("Atendente atualizado");
      } else {
        await crearAtendente({ nombre, pin });
        toast.success("Atendente criado");
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nombre">Nome</Label>
        <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pin">{atendente ? "Novo PIN (deixe vazio para manter)" : "PIN (4 dígitos)"}</Label>
        <Input
          id="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="\d{4}"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          required={!atendente}
          placeholder="••••"
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AtendentesManager({ atendentes }: { atendentes: Atendente[] }) {
  const [openNovo, setOpenNovo] = useState(false);
  const [editando, setEditando] = useState<Atendente | null>(null);

  async function handleAlternar(a: Atendente) {
    try {
      await alternarAtendenteActivo(a.id, !a.activo);
      toast.success(a.activo ? `${a.nombre} desativado` : `${a.nombre} ativado`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={openNovo} onOpenChange={setOpenNovo}>
          <DialogTrigger render={<Button />}>Novo atendente</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo atendente</DialogTitle>
            </DialogHeader>
            <AtendenteForm onDone={() => setOpenNovo(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {atendentes.map((a) => (
            <TableRow key={a.id}>
              <TableCell>{a.nombre}</TableCell>
              <TableCell>
                <Badge variant={a.activo ? "default" : "outline"}>{a.activo ? "Ativo" : "Inativo"}</Badge>
              </TableCell>
              <TableCell className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditando(a)}>
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleAlternar(a)}>
                  {a.activo ? "Desativar" : "Ativar"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar atendente</DialogTitle>
          </DialogHeader>
          {editando && <AtendenteForm atendente={editando} onDone={() => setEditando(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
