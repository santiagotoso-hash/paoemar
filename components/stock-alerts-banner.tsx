"use client";

import { useEffect, useState } from "react";
import { AlertTriangleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { StockAlertProducto } from "@/lib/realtime";

export function StockAlertsBanner({
  alertasIniciales,
}: {
  alertasIniciales: StockAlertProducto[];
}) {
  const [alertas, setAlertas] = useState<StockAlertProducto[]>(alertasIniciales);

  useEffect(() => {
    const source = new EventSource("/api/sse/stock-alerts");
    source.onmessage = (event) => {
      try {
        setAlertas(JSON.parse(event.data));
      } catch {
        // ignorar mensajes mal formados
      }
    };
    return () => source.close();
  }, []);

  if (alertas.length === 0) return null;

  return (
    <Alert variant="destructive">
      <AlertTriangleIcon />
      <AlertTitle>Estoque baixo em {alertas.length} produto(s)</AlertTitle>
      <AlertDescription>
        <ul className="list-inside list-disc">
          {alertas.map((a) => (
            <li key={a.id}>
              {a.nombre} ({a.codigo}): {a.stockActual} / mínimo {a.stockMinimo}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
