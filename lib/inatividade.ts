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

/**
 * Última atividade do atendente neste aparelho (localStorage). Assim recarregar a página
 * não zera o relógio de inatividade, e várias abas compartilham o mesmo relógio.
 */
const CHAVE_ATIVIDADE = "atendente-ultima-atividade:";

export function lerUltimaAtividade(atendenteId: string): number | null {
  try {
    const v = Number(localStorage.getItem(CHAVE_ATIVIDADE + atendenteId));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function registrarAtividade(atendenteId: string, quando = Date.now()) {
  try {
    localStorage.setItem(CHAVE_ATIVIDADE + atendenteId, String(quando));
  } catch {
    // armazenamento indisponível: o relógio segue só em memória nesta aba
  }
}
