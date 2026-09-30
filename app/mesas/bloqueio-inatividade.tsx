"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AVISO_SEG, INATIVIDADE_MIN, lerUltimaAtividade, registrarAtividade } from "@/lib/inatividade";
import { liberarSaidaDaPagina } from "./guarda-saida-mesa";

const LIMITE_MS = INATIVIDADE_MIN * 60 * 1000;
const EVENTOS = ["pointerdown", "keydown", "touchstart", "wheel"] as const;

/**
 * Aparelho parado por INATIVIDADE_MIN: encerra a sessão do atendente (também no servidor)
 * e volta para o PIN com o mesmo atendente escolhido. Nos últimos AVISO_SEG mostra "Continuar".
 * Usa horário (não contador): funciona mesmo se o celular dormir com a tela aberta.
 */
export function BloqueioInatividade({ atendente }: { atendente: { id: string; nombre: string } }) {
  const ultimaAtividade = useRef(Date.now());
  const ultimoRegistro = useRef(0);
  const encerrando = useRef(false);
  const [restanteSeg, setRestanteSeg] = useState<number | null>(null);

  // POST para /mesas/sair (apaga o cookie e redireciona para o PIN numa requisição só).
  const encerrar = useCallback(() => {
    if (encerrando.current) return;
    encerrando.current = true;
    liberarSaidaDaPagina(); // não mostrar "Sair do site?" do bloqueio de saída da mesa

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/mesas/sair";
    const campos = { atendente: atendente.id, voltar: window.location.pathname + window.location.search };
    for (const [nome, valor] of Object.entries(campos)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = nome;
      input.value = valor;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  }, [atendente.id]);

  const verificar = useCallback(() => {
    // O relógio salvo no aparelho vale para todas as abas (e sobrevive a recarregar a página).
    const salvo = lerUltimaAtividade(atendente.id);
    if (salvo) ultimaAtividade.current = Math.max(ultimaAtividade.current, salvo);
    const restante = LIMITE_MS - (Date.now() - ultimaAtividade.current);
    if (restante <= 0) {
      setRestanteSeg(null);
      encerrar();
    } else if (restante <= AVISO_SEG * 1000) {
      setRestanteSeg(Math.ceil(restante / 1000));
    } else {
      setRestanteSeg(null);
    }
  }, [encerrar, atendente.id]);

  useEffect(() => {
    // Ao montar (inclusive depois de recarregar), parte da última atividade salva, não de agora.
    const salvo = lerUltimaAtividade(atendente.id);
    if (salvo) ultimaAtividade.current = salvo;
    verificar();

    function atividade() {
      if (encerrando.current) return;
      const agora = Date.now();
      ultimaAtividade.current = agora;
      setRestanteSeg(null);
      if (agora - ultimoRegistro.current > 5_000) {
        ultimoRegistro.current = agora;
        registrarAtividade(atendente.id, agora);
      }
    }
    function aoVoltar() {
      if (document.visibilityState === "visible") verificar();
    }

    EVENTOS.forEach((e) => window.addEventListener(e, atividade, { passive: true }));
    document.addEventListener("visibilitychange", aoVoltar);
    const t = setInterval(verificar, 1000);
    return () => {
      EVENTOS.forEach((e) => window.removeEventListener(e, atividade));
      document.removeEventListener("visibilitychange", aoVoltar);
      clearInterval(t);
    };
  }, [verificar, atendente.id]);

  if (restanteSeg === null) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="inatividade-titulo"
      aria-describedby="inatividade-texto"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
    >
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-3xl bg-popover p-5 text-popover-foreground shadow-xl">
        <h2 id="inatividade-titulo" className="text-xl font-semibold">
          Ainda está aí, {atendente.nombre}?
        </h2>
        <p id="inatividade-texto" className="text-sm text-muted-foreground" aria-live="polite">
          Por segurança, a sessão será encerrada em <strong className="text-foreground">{restanteSeg} s</strong> e
          será preciso digitar o PIN de novo. Os itens ainda não lançados ficam guardados.
        </p>
        {/* Qualquer toque já conta como atividade; o botão deixa isso explícito. */}
        <Button size="touch" className="w-full" autoFocus>
          Continuar
        </Button>
      </div>
    </div>
  );
}
