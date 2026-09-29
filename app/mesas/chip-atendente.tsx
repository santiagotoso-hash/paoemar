import Link from "next/link";
import { ChevronDown, LogOut } from "lucide-react";
import type { AtendenteSessao } from "@/lib/atendente";
import { sairAtendente } from "./actions";
import { AvatarAtendente } from "./avatar-atendente";

/**
 * Chip do topo: mostra quem está atendendo e leva para a troca de atendente.
 * O botão ao lado encerra a sessão (aparelho compartilhado: o próximo não lança em nome de outro).
 */
export function ChipAtendente({ atendente }: { atendente: AtendenteSessao }) {
  return (
    <div className="flex items-center gap-1">
      <Link
        href="/mesas/entrar"
        aria-label={`Atendente: ${atendente.nombre}. Trocar atendente`}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 text-sm font-medium transition-colors hover:bg-muted"
      >
        <AvatarAtendente nombre={atendente.nombre} className="size-9 text-base" />
        {atendente.nombre}
        <ChevronDown className="size-4 text-muted-foreground" />
      </Link>
      <form action={sairAtendente}>
        <button
          type="submit"
          aria-label="Sair (encerrar sessão do atendente)"
          title="Sair"
          className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-5" />
        </button>
      </form>
    </div>
  );
}
