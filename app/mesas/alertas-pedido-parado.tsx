"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { chaveAlerta, estaParado, minutosNoEstado, textoParado } from "@/lib/alertas";
import { avisar, desbloquearAudio } from "@/lib/avisos-sonoros";
import { rondasEmAndamento, type RondaEmAndamento } from "./actions";

const INTERVALO_MS = 30_000;
const CHAVE_STORAGE = "alertas-pedido-parado";

/** Avisos já mostrados (sobrevive a recarregar a página / PIN de novo). */
function jaAvisados(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CHAVE_STORAGE) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}
function marcarAvisado(chave: string) {
  try {
    const lista = Array.from(jaAvisados());
    lista.push(chave);
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(lista.slice(-200)));
  } catch {}
}

/**
 * Aviso para o atendente quando uma rodada de uma mesa DELE fica parada
 * (limites por estado em lib/alertas.ts). Beep + vibração + aviso com "Ver mesa".
 */
export function AlertasPedidoParado() {
  const router = useRouter();
  const [rondas, setRondas] = useState<RondaEmAndamento[]>([]);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    let ativo = true;
    async function buscar() {
      try {
        const r = await rondasEmAndamento();
        if (ativo) setRondas(r);
      } catch {
        // sessão caiu (inatividade) ou rede: tenta de novo no próximo ciclo
      }
      if (ativo) setAgora(Date.now());
    }
    void buscar();
    const t = setInterval(buscar, INTERVALO_MS);
    window.addEventListener("pointerdown", desbloquearAudio);
    return () => {
      ativo = false;
      clearInterval(t);
      window.removeEventListener("pointerdown", desbloquearAudio);
    };
  }, []);

  useEffect(() => {
    const avisados = jaAvisados();
    for (const r of rondas) {
      if (!estaParado(r.estado, r.estadoDesde, agora)) continue;
      const chave = chaveAlerta(r.id, r.estado);
      if (avisados.has(chave)) continue;
      marcarAvisado(chave);
      const texto = textoParado(r.pedido, r.estado, minutosNoEstado(r.estadoDesde, agora));
      avisar("Pedido parado", texto, chave);
      toast.warning(texto, {
        duration: 20_000,
        action: { label: "Ver mesa", onClick: () => router.push(`/mesas/${r.comandaId}`) },
      });
    }
  }, [rondas, agora, router]);

  return null;
}
