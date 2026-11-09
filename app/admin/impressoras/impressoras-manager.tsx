"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CONEXOES, TEXTO_CONEXAO, TEXTO_DESTINO, type ConfigImpressora, type Conexao } from "@/lib/impressoras";
import { imprimirTicket, ticketDeTeste } from "@/lib/impressao";
import { salvarImpressora } from "./actions";

function ImpressoraForm({ inicial }: { inicial: ConfigImpressora }) {
  const [nome, setNome] = useState(inicial.nome);
  const [ativa, setAtiva] = useState(inicial.ativa);
  const [conexao, setConexao] = useState<Conexao>(inicial.conexao);
  const [endereco, setEndereco] = useState(inicial.endereco);
  const [porta, setPorta] = useState(inicial.porta);
  const [larguraMm, setLarguraMm] = useState<58 | 80>(inicial.larguraMm);
  const [copias, setCopias] = useState(inicial.copias);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await salvarImpressora({
        destino: inicial.destino,
        nome,
        ativa,
        conexao,
        endereco,
        porta: conexao === "REDE" ? porta : "",
        larguraMm,
        copias,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Impressora da ${TEXTO_DESTINO[inicial.destino].toLowerCase()} salva`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label htmlFor={`ativa-${inicial.destino}`} className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          id={`ativa-${inicial.destino}`}
          type="checkbox"
          checked={ativa}
          onChange={(e) => setAtiva(e.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          Impressora ativa
          <span className="block text-xs text-muted-foreground">Desligada, nenhum ticket sai para este destino.</span>
        </span>
      </label>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`nome-${inicial.destino}`}>Nome</Label>
        <Input id={`nome-${inicial.destino}`} value={nome} onChange={(e) => setNome(e.target.value)} required />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label>Conexão</Label>
          <Select
            value={conexao}
            onValueChange={(v) => setConexao(v as Conexao)}
            items={Object.fromEntries(CONEXOES.map((c) => [c, TEXTO_CONEXAO[c]]))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONEXOES.map((c) => (
                <SelectItem key={c} value={c}>
                  {TEXTO_CONEXAO[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Largura do papel</Label>
          <Select
            value={String(larguraMm)}
            onValueChange={(v) => setLarguraMm(v === "58" ? 58 : 80)}
            items={{ "58": "58 mm", "80": "80 mm" }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="58">58 mm</SelectItem>
              <SelectItem value="80">80 mm</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`endereco-${inicial.destino}`}>
            {conexao === "REDE" ? "Endereço IP" : "Nome da impressora no Windows"}
          </Label>
          <Input
            id={`endereco-${inicial.destino}`}
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder={conexao === "REDE" ? "192.168.0.50" : "Exatamente como aparece em Impressoras do Windows"}
            autoComplete="off"
          />
        </div>
        {conexao === "REDE" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`porta-${inicial.destino}`}>Porta</Label>
            <Input
              id={`porta-${inicial.destino}`}
              inputMode="numeric"
              value={porta}
              onChange={(e) => setPorta(e.target.value.replace(/\D/g, ""))}
              placeholder="9100"
            />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`copias-${inicial.destino}`}>Vias</Label>
          <Input
            id={`copias-${inicial.destino}`}
            type="number"
            min={1}
            max={5}
            value={copias}
            onChange={(e) => setCopias(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Os tickets dos pedidos saem sozinhos pelo programa de impressão instalado no computador da loja, que lê a fila do
        servidor e usa estes dados: o IP e a porta (Rede) ou o nome da impressora no Windows (USB/Bluetooth). O botão
        “Imprimir teste” abaixo usa o navegador deste aparelho.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="outline" onClick={() => imprimirTicket(ticketDeTeste(nome, larguraMm, copias))}>
          <Printer />
          Imprimir teste
        </Button>
      </div>
    </form>
  );
}

export function ImpressorasManager({ configs }: { configs: ConfigImpressora[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {configs.map((c) => (
        <Card key={c.destino}>
          <CardHeader>
            <CardTitle>{TEXTO_DESTINO[c.destino]}</CardTitle>
          </CardHeader>
          <CardContent>
            <ImpressoraForm inicial={c} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
