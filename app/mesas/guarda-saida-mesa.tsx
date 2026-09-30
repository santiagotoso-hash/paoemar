"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { salvarPendentes, totalPendente, usePendentes } from "./pendentes";
import { lancarPendentes } from "./lancar-pendentes";

/** Saídas legítimas da página inteira (ex.: bloqueio por inatividade) não mostram "Sair do site?". */
let saidaLiberada = false;
export function liberarSaidaDaPagina() {
  saidaLiberada = true;
}

/**
 * Mesas abertas só para visualização (de outro atendente): os pendentes que houver no aparelho
 * não são deste atendente, então sair delas não é bloqueado.
 */
const mesasSomenteLeitura = new Set<string>();
export function useMesaSomenteLeitura(mesaId: string, somenteLeitura: boolean) {
  useEffect(() => {
    if (somenteLeitura) mesasSomenteLeitura.add(mesaId);
    else mesasSomenteLeitura.delete(mesaId);
  }, [mesaId, somenteLeitura]);
}

/** /mesas/<id> e /mesas/<id>/lancar são "dentro da mesa". */
function mesaDaRota(pathname: string) {
  const m = pathname.match(/^\/mesas\/([^/]+)/);
  if (!m || m[1] === "abrir" || m[1] === "entrar") return null;
  return m[1];
}

/**
 * Não deixa sair de uma mesa com itens ainda não lançados (para não esquecer de mandar à cozinha).
 * - Links: o clique é barrado antes de navegar.
 * - Voltar do navegador/celular: não dá para barrar antes; o app volta para a mesa e mostra o aviso.
 * - Fechar/recarregar a aba: aviso nativo do navegador (os itens continuam guardados no aparelho).
 */
export function GuardaSaidaMesa() {
  const pathname = usePathname();
  const router = useRouter();
  const mesaAtual = mesaDaRota(pathname);

  // A mesa em que o atendente estava (continua valendo por um instante depois que a rota muda).
  const [mesaGuardada, setMesaGuardada] = useState<string | null>(mesaAtual);
  const [pendentes] = usePendentes(mesaGuardada ?? "");
  const temPendentes = !!mesaGuardada && pendentes.length > 0 && !mesasSomenteLeitura.has(mesaGuardada);

  const [aviso, setAviso] = useState<{ destino: string } | null>(null);
  const [lancando, setLancando] = useState(false);
  const liberado = useRef(false);

  // Troca de rota (inclusive pelo botão voltar).
  useEffect(() => {
    if (mesaAtual) {
      if (mesaAtual !== mesaGuardada) setMesaGuardada(mesaAtual);
      return;
    }
    // Mesa fechada/liberada (em outro aparelho): os pendentes não têm mais destino, descarta.
    const fechada = new URLSearchParams(window.location.search).get("fechada");
    if (mesaGuardada && fechada === mesaGuardada) {
      if (temPendentes) {
        salvarPendentes(mesaGuardada, []);
        toast.error("Esta mesa já foi fechada. Os itens não lançados foram descartados.");
      }
      setMesaGuardada(null);
      return;
    }
    if (temPendentes && !liberado.current) {
      router.replace(`/mesas/${mesaGuardada}`);
      setAviso({ destino: pathname });
      return;
    }
    liberado.current = false;
    setMesaGuardada(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Links: barra antes de navegar (captura roda antes do onClick do <Link>).
  useEffect(() => {
    if (!temPendentes) return;
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank") return;
      const url = new URL(a.href, window.location.href);
      const dentro = url.origin === window.location.origin && mesaDaRota(url.pathname) === mesaGuardada;
      if (dentro) return;
      e.preventDefault();
      e.stopPropagation();
      setAviso({ destino: url.origin === window.location.origin ? url.pathname + url.search : "/mesas" });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [temPendentes, mesaGuardada]);

  // Fechar ou recarregar a aba.
  useEffect(() => {
    if (!temPendentes) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (saidaLiberada) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [temPendentes]);

  async function handleLancarESair() {
    if (!mesaGuardada || !aviso) return;
    setLancando(true);
    try {
      const res = await lancarPendentes(mesaGuardada, pendentes);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Rodada enviada à cozinha");
      liberado.current = true;
      const destino = aviso.destino;
      setAviso(null);
      router.push(destino);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao lançar os itens");
    } finally {
      setLancando(false);
    }
  }

  if (!aviso || !temPendentes) return null;

  const qtd = pendentes.reduce((acc, i) => acc + i.qtd, 0);
  const total = pendentes.reduce((acc, i) => acc + totalPendente(i), 0);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="guarda-titulo"
      aria-describedby="guarda-texto"
      className="fixed inset-0 z-[55] flex items-end justify-center bg-black/40 p-4 sm:items-center"
    >
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-3xl bg-popover p-5 text-popover-foreground shadow-xl">
        <h2 id="guarda-titulo" className="text-xl font-semibold">
          Itens ainda não lançados
        </h2>
        <p id="guarda-texto" className="text-sm text-muted-foreground">
          {qtd} {qtd === 1 ? "item" : "itens"} ({formatBRL(total)}) desta mesa ainda não{" "}
          {qtd === 1 ? "foi" : "foram"} para a cozinha. Lance antes de sair.
        </p>
        <Button size="touch" className="w-full" onClick={handleLancarESair} disabled={lancando} autoFocus>
          <Send />
          {lancando ? "Lançando..." : "Lançar agora e sair"}
        </Button>
        <Button size="touch" variant="outline" className="w-full" onClick={() => setAviso(null)} disabled={lancando}>
          Continuar na mesa
        </Button>
      </div>
    </div>
  );
}
