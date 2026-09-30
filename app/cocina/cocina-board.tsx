"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VentaEvent } from "@/lib/realtime";
import { cn } from "@/lib/utils";
import { chaveAlerta, estaParado, minutosNoEstado, textoParado } from "@/lib/alertas";
import { avisar, desbloquearAudio, pedirPermissaoNotificacao } from "@/lib/avisos-sonoros";
import { avanzarEstadoRonda, avanzarEstadoVenta } from "./actions";

const COLUMNAS = [
  { estado: "RECIBIDO", label: "Recebido" },
  { estado: "EN_PREPARACION", label: "Em preparo" },
  { estado: "LISTO", label: "Pronto" },
] as const;

const ORIGEN_LABEL: Record<string, string> = {
  MOSTRADOR: "Balcão",
  COMANDA: "Comanda",
  MESA: "Mesa",
};

export function CocinaBoard({ ventasIniciales }: { ventasIniciales: VentaEvent[] }) {
  const [ventas, setVentas] = useState<VentaEvent[]>(ventasIniciales);
  const [agora, setAgora] = useState(() => Date.now());
  const alertados = useRef(new Set<string>());
  const [podeNotificar, setPodeNotificar] = useState(true);

  // Relógio do "pedido parado" + áudio liberado no primeiro toque.
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 15_000);
    window.addEventListener("pointerdown", desbloquearAudio);
    setPodeNotificar(!("Notification" in window) || Notification.permission !== "default");
    return () => {
      clearInterval(t);
      window.removeEventListener("pointerdown", desbloquearAudio);
    };
  }, []);

  // Avisa uma vez por rodada + estado quando passa do limite (lib/alertas.ts).
  useEffect(() => {
    for (const v of ventas) {
      if (!estaParado(v.estado, v.estadoDesde, agora)) continue;
      const chave = chaveAlerta(v.id, v.estado);
      if (alertados.current.has(chave)) continue;
      alertados.current.add(chave);
      const texto = textoParado(v.codigo, v.estado, minutosNoEstado(v.estadoDesde!, agora));
      avisar("Pedido parado", texto, chave);
      toast.warning(texto, { duration: 15_000 });
    }
  }, [ventas, agora]);

  useEffect(() => {
    const source = new EventSource("/api/sse/cocina");
    source.onmessage = (event) => {
      try {
        const venta: VentaEvent = JSON.parse(event.data);
        setVentas((prev) => {
          if (venta.estado === "ENTREGADO") {
            return prev.filter((v) => v.id !== venta.id);
          }
          const existe = prev.some((v) => v.id === venta.id);
          if (existe) return prev.map((v) => (v.id === venta.id ? venta : v));
          return [...prev, venta];
        });
      } catch {
        // ignorar mensajes mal formados
      }
    };
    return () => source.close();
  }, []);

  async function handleAvanzar(v: VentaEvent) {
    try {
      await (v.origen === "MESA" ? avanzarEstadoRonda(v.id) : avanzarEstadoVenta(v.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao avançar o status");
    }
  }

  return (
    <div className="flex flex-col gap-3 p-6">
    {!podeNotificar && (
      <Button
        variant="outline"
        size="sm"
        className="self-end"
        onClick={async () => {
          await pedirPermissaoNotificacao();
          setPodeNotificar(true);
        }}
      >
        <BellRing />
        Ativar alertas de pedido parado
      </Button>
    )}
    <div className="grid gap-4 sm:grid-cols-3">
      {COLUMNAS.map((col) => (
        <div key={col.estado} className="flex flex-col gap-3">
          <h2 className="font-semibold">{col.label}</h2>
          {ventas
            .filter((v) => v.estado === col.estado)
            .map((v) => {
              const parado = estaParado(v.estado, v.estadoDesde, agora);
              return (
              <Card key={v.id} className={cn(parado && "ring-2 ring-destructive")}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{v.codigo}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {ORIGEN_LABEL[v.origen] ?? v.origen}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {parado && (
                    <p className="inline-flex w-fit items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                      <BellRing className="size-3.5" aria-hidden />
                      Parado há {minutosNoEstado(v.estadoDesde!, agora)} min
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">{v.nombreCliente}</p>
                  <ul className="text-sm">
                    {v.items.map((item, idx) => (
                      <li key={idx}>
                        {item.cantidad}x {item.productoNombre}
                        {item.notas ? ` (${item.notas})` : ""}
                      </li>
                    ))}
                  </ul>
                  <Button size="sm" onClick={() => handleAvanzar(v)}>
                    {col.estado === "LISTO" ? "Marcar entregue" : "Avançar"}
                  </Button>
                </CardContent>
              </Card>
              );
            })}
          {ventas.filter((v) => v.estado === col.estado).length === 0 && (
            <p className="text-sm text-muted-foreground">Sem pedidos.</p>
          )}
        </div>
      ))}
    </div>
    </div>
  );
}
