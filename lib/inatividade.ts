/** Minutos sem tocar no aparelho até pedir o PIN de novo. */
export const INATIVIDADE_MIN = 5;
/** Segundos finais em que aparece o aviso "Continuar". */
export const AVISO_SEG = 30;

/** Só aceita voltar para telas de mesa (evita redirecionar para fora do app). */
export function voltarSeguro(voltar: string | undefined | null) {
  if (!voltar || !voltar.startsWith("/mesas") || voltar.startsWith("//") || voltar.startsWith("/mesas/entrar")) {
    return "/mesas";
  }
  return voltar;
}
