"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ORIGENS, TEXTO_ORIGEM } from "@/lib/fiscal";
import { salvarConfiguracaoFiscal, salvarFiscalCategoria } from "./actions";

type Config = { ativa: boolean; ambiente: "HOMOLOGACAO" | "PRODUCAO"; cnpj: string };

type CategoriaFiscal = {
  id: string;
  nombre: string;
  icono: string | null;
  ncm: string;
  cfop: string;
  csosn: string;
  origem: number | null;
  produtos: number;
  incompletos: number;
  comDadosProprios: number;
};

const TEXTO_AMBIENTE = { HOMOLOGACAO: "Homologação (testes, sem valor fiscal)", PRODUCAO: "Produção (notas valendo)" } as const;

function ConfiguracaoForm({ inicial, tokenConfigurado }: { inicial: Config; tokenConfigurado: boolean }) {
  const [ativa, setAtiva] = useState(inicial.ativa);
  const [ambiente, setAmbiente] = useState(inicial.ambiente);
  const [cnpj, setCnpj] = useState(inicial.cnpj);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await salvarConfiguracaoFiscal({ ativa, ambiente, cnpj });
      if (!res.ok) toast.error(res.error);
      else toast.success("Configuração fiscal salva");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label htmlFor="fiscal-ativa" className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          id="fiscal-ativa"
          type="checkbox"
          checked={ativa}
          onChange={(e) => setAtiva(e.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          Emissão de notas ativa
          <span className="block text-xs text-muted-foreground">Se desmarcar, nenhuma nota fiscal é emitida.</span>
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Ambiente</Label>
          <Select
            value={ambiente}
            onValueChange={(v) => setAmbiente(v as Config["ambiente"])}
            items={TEXTO_AMBIENTE}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HOMOLOGACAO">{TEXTO_AMBIENTE.HOMOLOGACAO}</SelectItem>
              <SelectItem value="PRODUCAO">{TEXTO_AMBIENTE.PRODUCAO}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fiscal-cnpj">CNPJ do emitente</Label>
          <Input
            id="fiscal-cnpj"
            inputMode="numeric"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            placeholder="00.000.000/0000-00"
            autoComplete="off"
          />
        </div>
      </div>

      <p className="flex items-center gap-2 text-sm">
        {tokenConfigurado ? (
          <>
            <CircleCheck className="size-4 text-primary" aria-hidden />
            Token do Focus NFe configurado no servidor.
          </>
        ) : (
          <>
            <CircleAlert className="size-4 text-destructive" aria-hidden />
            <span>
              Falta o token do Focus NFe: crie a variável <code>FOCUSNFE_TOKEN</code> no servidor (Vercel).
            </span>
          </>
        )}
      </p>

      <div>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

function CategoriaCartao({ categoria }: { categoria: CategoriaFiscal }) {
  const [ncm, setNcm] = useState(categoria.ncm);
  const [cfop, setCfop] = useState(categoria.cfop);
  const [csosn, setCsosn] = useState(categoria.csosn);
  const [origem, setOrigem] = useState<number | null>(categoria.origem);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await salvarFiscalCategoria(categoria.id, { ncm, cfop, csosn, origem });
      if (!res.ok) toast.error(res.error);
      else toast.success(`Dados fiscais de ${categoria.nombre} salvos`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>
            {categoria.icono} {categoria.nombre}
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {categoria.produtos === 0
              ? "Sem produtos ativos"
              : categoria.incompletos === 0
                ? `${categoria.produtos} produtos · todos completos`
                : `${categoria.incompletos} de ${categoria.produtos} produtos incompletos`}
            {categoria.comDadosProprios > 0 && ` · ${categoria.comDadosProprios} com dados próprios`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_5rem_5rem_1.4fr_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`ncm-${categoria.id}`}>NCM</Label>
            <Input
              id={`ncm-${categoria.id}`}
              inputMode="numeric"
              value={ncm}
              onChange={(e) => setNcm(e.target.value)}
              placeholder="0000.00.00"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`cfop-${categoria.id}`}>CFOP</Label>
            <Input
              id={`cfop-${categoria.id}`}
              inputMode="numeric"
              value={cfop}
              onChange={(e) => setCfop(e.target.value)}
              placeholder="5102"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`csosn-${categoria.id}`}>CSOSN</Label>
            <Input
              id={`csosn-${categoria.id}`}
              inputMode="numeric"
              value={csosn}
              onChange={(e) => setCsosn(e.target.value)}
              placeholder="102"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Origem</Label>
            <Select
              value={origem === null ? "" : String(origem)}
              onValueChange={(v) => setOrigem(v === "" || v === null ? null : Number(v))}
              items={Object.fromEntries(ORIGENS.map((o) => [String(o), TEXTO_ORIGEM[o]]))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolha" />
              </SelectTrigger>
              <SelectContent>
                {ORIGENS.map((o) => (
                  <SelectItem key={o} value={String(o)}>
                    {TEXTO_ORIGEM[o]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function FiscalManager({
  config,
  tokenConfigurado,
  categorias,
}: {
  config: Config;
  tokenConfigurado: boolean;
  categorias: CategoriaFiscal[];
}) {
  const totalIncompletos = categorias.reduce((acc, c) => acc + c.incompletos, 0);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Emissão de notas fiscais</CardTitle>
        </CardHeader>
        <CardContent>
          <ConfiguracaoForm inicial={config} tokenConfigurado={tokenConfigurado} />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold">Dados fiscais por categoria</h2>
          <p className="text-sm text-muted-foreground">
            Valem para todos os produtos da categoria que não tiverem dados próprios. Quem define NCM, CFOP e CSOSN é o
            contador da empresa.
          </p>
          <p className="mt-1 text-sm font-medium">
            {totalIncompletos === 0
              ? "Todos os produtos ativos estão com os dados fiscais completos."
              : `${totalIncompletos} produtos ativos ainda sem os dados fiscais completos.`}
          </p>
        </div>
        {categorias.map((c) => (
          <CategoriaCartao key={c.id} categoria={c} />
        ))}
      </section>
    </div>
  );
}
