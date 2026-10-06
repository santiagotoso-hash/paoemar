const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 12.5 -> "R$ 12,50" */
export function formatBRL(valor: number) {
  return brl.format(valor);
}

/** Fuso da casa: o servidor (Vercel) roda em UTC, então fixamos para servidor e aparelho baterem. */
const hora = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** "14:32" */
export function formatHora(iso: string) {
  return hora.format(new Date(iso));
}

/** "há 5 min", "há 1 h 05" — tempo desde uma data ISO. */
export function tempoDesde(iso: string, agora: number = Date.now()) {
  const min = Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  return `há ${h} h ${String(min % 60).padStart(2, "0")}`;
}

/** Redondea a centavos antes de guardar o comparar montos (evita 14.000000000000002). */
export function redondear2(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/** 00:00 de hoje no fuso da casa (Brasil sem horário de verão desde 2019: -03:00). */
export function inicioDoDiaSP(agora: Date = new Date()) {
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora); // AAAA-MM-DD
  return new Date(`${dia}T00:00:00-03:00`);
}
