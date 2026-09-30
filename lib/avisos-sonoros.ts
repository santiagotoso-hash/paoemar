"use client";

/**
 * Aviso dentro da app: beep (Web Audio, sem arquivo), vibração (Android) e,
 * se a aba estiver em segundo plano e o navegador permitir, notificação do sistema.
 * Sem service worker: não chega com a app fechada.
 */

let ctx: AudioContext | null = null;

/** O navegador só libera áudio depois de um toque: chamar num pointerdown. */
export function desbloquearAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {}
}

function beep(freq: number, inicio: number, duracao: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const ganho = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = "sine";
  ganho.gain.setValueAtTime(0.0001, ctx.currentTime + inicio);
  ganho.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + inicio + 0.02);
  ganho.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + inicio + duracao);
  osc.connect(ganho).connect(ctx.destination);
  osc.start(ctx.currentTime + inicio);
  osc.stop(ctx.currentTime + inicio + duracao + 0.05);
}

export function avisar(titulo: string, texto: string, tag: string) {
  try {
    beep(880, 0, 0.18);
    beep(660, 0.22, 0.25);
  } catch {}
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {}
  try {
    // Só em segundo plano (em primeiro plano já aparece o aviso na tela).
    // Android Chrome não aceita `new Notification` sem service worker: cai no catch.
    if (document.hidden && "Notification" in window && Notification.permission === "granted") {
      new Notification(titulo, { body: texto, tag });
    }
  } catch {}
}

/** Pede permissão de notificação (tem que ser chamado num toque). */
export async function pedirPermissaoNotificacao() {
  desbloquearAudio();
  try {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  } catch {}
}
