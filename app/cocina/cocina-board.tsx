"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VentaEvent } from "@/lib/realtime";
import { avanzarEstadoRonda, avanzarEstadoVenta } from "./actions";

const COLUMNAS = [
  { estado: "RECIBIDO", label: "Recibido" },
  { estado: "EN_PREPARACION", label: "En preparación" },
  { estado: "LISTO", label: "Listo" },
] as const;

const ORIGEN_LABEL: Record<string, string> = {
  MOSTRADOR: "Mostrador",
  COMANDA: "Comanda",
  MESA: "Mesa",
};

export function CocinaBoard({ ventasIniciales }: { ventasIniciales: VentaEvent[] }) {
  const [ventas, setVentas] = useState<VentaEvent[]>(ventasIniciales);

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
      toast.error(err instanceof Error ? err.message : "Error al avanzar el estado");
    }
  }

  return (
    <div className="grid gap-4 p-6 sm:grid-cols-3">
      {COLUMNAS.map((col) => (
        <div key={col.estado} className="flex flex-col gap-3">
          <h2 className="font-semibold">{col.label}</h2>
          {ventas
            .filter((v) => v.estado === col.estado)
            .map((v) => (
              <Card key={v.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{v.codigo}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {ORIGEN_LABEL[v.origen] ?? v.origen}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
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
                    {col.estado === "LISTO" ? "Marcar entregado" : "Avanzar"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          {ventas.filter((v) => v.estado === col.estado).length === 0 && (
            <p className="text-sm text-muted-foreground">Sin pedidos.</p>
          )}
        </div>
      ))}
    </div>
  );
}
