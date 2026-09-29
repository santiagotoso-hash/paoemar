import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { AtendenteSessao } from "@/lib/atendente";
import { AvatarAtendente } from "./avatar-atendente";

/** Chip do topo: mostra quem está atendendo e leva para a troca de atendente. */
export function ChipAtendente({ atendente }: { atendente: AtendenteSessao }) {
  return (
    <Link
      href="/mesas/entrar"
      aria-label={`Atendente: ${atendente.nombre}. Trocar atendente`}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 text-sm font-medium transition-colors hover:bg-muted"
    >
      <AvatarAtendente nombre={atendente.nombre} className="size-9 text-base" />
      {atendente.nombre}
      <ChevronDown className="size-4 text-muted-foreground" />
    </Link>
  );
}
