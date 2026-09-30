/**
 * Pedido parado: minutos no MESMO estado até avisar (atendente da mesa e cozinha).
 * Ajuste aqui conforme o ritmo da casa.
 */
export const LIMITE_PARADO_MIN = {
  RECIBIDO: 5, // ninguém começou na cozinha
  EN_PREPARACION: 15, // demorando para ficar pronto
  LISTO: 3, // pronto e ninguém levou à mesa
} as const;

type EstadoAlerta = keyof typeof LIMITE_PARADO_MIN;

export function minutosNoEstado(estadoDesde: string, agora: number = Date.now()) {
  return Math.max(0, Math.floor((agora - new Date(estadoDesde).getTime()) / 60000));
}

export function estaParado(estado: string, estadoDesde: string | undefined, agora: number = Date.now()) {
  if (!estadoDesde || !(estado in LIMITE_PARADO_MIN)) return false;
  return minutosNoEstado(estadoDesde, agora) >= LIMITE_PARADO_MIN[estado as EstadoAlerta];
}

/** "Mesa 7 · Rodada 2 pronta há 4 min, esperando ser levada à mesa" */
export function textoParado(pedido: string, estado: string, minutos: number) {
  switch (estado) {
    case "RECIBIDO":
      return `${pedido} há ${minutos} min sem ser iniciada na cozinha`;
    case "EN_PREPARACION":
      return `${pedido} em preparo há ${minutos} min`;
    case "LISTO":
      return `${pedido} pronta há ${minutos} min, esperando ser levada à mesa`;
    default:
      return `${pedido} parada há ${minutos} min`;
  }
}

/** Chave para avisar uma vez só por rodada + estado. */
export function chaveAlerta(id: string, estado: string) {
  return `${id}:${estado}`;
}
