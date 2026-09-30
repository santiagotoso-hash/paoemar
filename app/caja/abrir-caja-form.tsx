"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { abrirCaja } from "./actions";

export function AbrirCajaForm() {
  const router = useRouter();
  const [fondoInicial, setFondoInicial] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await abrirCaja({ fondoInicial });
      toast.success("Caixa aberto");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao abrir o caixa");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abrir caixa</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fondoInicial">Fundo de troco</Label>
            <Input
              id="fondoInicial"
              type="number"
              step="0.01"
              min="0"
              value={fondoInicial}
              onChange={(e) => setFondoInicial(e.target.value)}
              required
              autoFocus
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Abrindo..." : "Abrir caixa"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
