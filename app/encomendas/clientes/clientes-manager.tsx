"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, History, Mail, MapPin, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { crearCliente, editarCliente, excluirCliente } from "./actions";

type Cliente = {
  id: string;
  nombre: string;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  cnpj: string | null;
  notas: string | null;
};

function ClienteForm({ cliente, onDone }: { cliente?: Cliente; onDone: () => void }) {
  const [nombre, setNombre] = useState(cliente?.nombre ?? "");
  const [endereco, setEndereco] = useState(cliente?.endereco ?? "");
  const [telefone, setTelefone] = useState(cliente?.telefone ?? "");
  const [email, setEmail] = useState(cliente?.email ?? "");
  const [cnpj, setCnpj] = useState(cliente?.cnpj ?? "");
  const [notas, setNotas] = useState(cliente?.notas ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const dados = { nombre, endereco, telefone, email, cnpj, notas };
      const res = cliente ? await editarCliente(cliente.id, dados) : await crearCliente(dados);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(cliente ? "Cliente atualizado" : "Cliente cadastrado");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar o cliente");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto pr-1">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cli-nome">Nome</Label>
        <Input id="cli-nome" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cli-endereco">Endereço</Label>
        <Input id="cli-endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} autoComplete="off" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cli-telefone">Telefone</Label>
          <Input
            id="cli-telefone"
            inputMode="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(71) 99999-9999"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cli-email">E-mail</Label>
          <Input id="cli-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cli-cnpj">CNPJ</Label>
        <Input
          id="cli-cnpj"
          inputMode="numeric"
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
          placeholder="00.000.000/0000-00"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cli-notas">Observações</Label>
        <Textarea id="cli-notas" value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ClientesManager({ clientes }: { clientes: Cliente[] }) {
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  async function handleExcluir(c: Cliente) {
    if (!window.confirm(`Excluir o cliente ${c.nombre}? As encomendas dele continuam registradas.`)) return;
    setExcluindo(c.id);
    try {
      await excluirCliente(c.id);
      toast.success("Cliente excluído");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setExcluindo(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/encomendas" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Voltar às encomendas
      </Link>

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <Dialog open={novo} onOpenChange={setNovo}>
          <DialogTrigger render={<Button />}>
            <Plus />
            Novo cliente
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo cliente</DialogTitle>
            </DialogHeader>
            <ClienteForm onDone={() => setNovo(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {clientes.length === 0 ? (
        <p className="text-muted-foreground">Nenhum cliente cadastrado.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {clientes.map((c) => (
            <li key={c.id} className="flex flex-col gap-1.5 rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{c.nombre}</p>
                  {c.cnpj && <p className="text-xs text-muted-foreground">CNPJ {c.cnpj}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="outline" size="icon" aria-label={`Editar ${c.nombre}`} onClick={() => setEditando(c)}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Excluir ${c.nombre}`}
                    disabled={excluindo === c.id}
                    onClick={() => handleExcluir(c)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                {c.endereco && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    {c.endereco}
                  </span>
                )}
                {c.telefone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0" aria-hidden />
                    {c.telefone}
                  </span>
                )}
                {c.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="size-3.5 shrink-0" aria-hidden />
                    {c.email}
                  </span>
                )}
              </div>
              {c.notas && <p className="text-sm">{c.notas}</p>}
              <Button
                variant="outline"
                size="sm"
                className="mt-1 self-start"
                nativeButton={false}
                render={<Link href={`/encomendas/historico?clienteId=${c.id}`} />}
              >
                <History />
                Histórico de encomendas
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!editando} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          {editando && <ClienteForm cliente={editando} onDone={() => setEditando(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
