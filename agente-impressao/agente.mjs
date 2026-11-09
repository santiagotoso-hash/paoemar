// Programa de impressão da loja: busca no servidor os tickets pendentes e imprime.
// Sem dependências: precisa só do Node 18 ou mais novo. Veja o LEIAME.md.
import { execFile } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, renameSync, statSync } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Lê o .env que fica ao lado deste arquivo (as variáveis do sistema têm prioridade).
const pasta = path.dirname(fileURLToPath(import.meta.url));
const arquivoEnv = path.join(pasta, ".env");
if (existsSync(arquivoEnv)) {
  for (const linha of readFileSync(arquivoEnv, "utf8").split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const APP_URL = (process.env.APP_URL ?? "").replace(/\/+$/, "");
const TOKEN = process.env.PRINT_AGENT_TOKEN ?? "";
const DESTINOS = (process.env.DESTINOS ?? "COZINHA,PRODUCAO").split(",").map((d) => d.trim()).filter(Boolean);
const INTERVALO_MS = Number(process.env.INTERVALO_MS ?? 2000);
const BYPASS_VERCEL = process.env.VERCEL_BYPASS ?? "";
// SIMULAR=1 escreve o ticket na tela em vez de imprimir (para testar sem impressora).
const SIMULAR = process.env.SIMULAR === "1";

if (!APP_URL || !TOKEN) {
  console.error("Faltam APP_URL e PRINT_AGENT_TOKEN no arquivo .env (copie o .env.example).");
  process.exit(1);
}

// Escreve na tela e também no agente.log (o que sobra quando roda escondido, sem janela).
const ARQUIVO_LOG = path.join(pasta, "agente.log");
const log = (...a) => {
  const linha = `${new Date().toLocaleString("pt-BR")} ${a.join(" ")}`;
  console.log(linha);
  try {
    // Passou de 1 MB: guarda o antigo e recomeça, para o arquivo não crescer para sempre.
    if (existsSync(ARQUIVO_LOG) && statSync(ARQUIVO_LOG).size > 1_000_000) renameSync(ARQUIVO_LOG, `${ARQUIVO_LOG}.antigo`);
    appendFileSync(ARQUIVO_LOG, linha + "\n");
  } catch {
    // Sem permissão para escrever o log não pode derrubar a impressão.
  }
};

// ---------- Montagem do texto ----------

const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

function quebrar(texto, colunas) {
  const saida = [];
  for (const original of texto.split("\n")) {
    let resto = original;
    while (resto.length > colunas) {
      let corte = resto.lastIndexOf(" ", colunas);
      if (corte < colunas / 2) corte = colunas;
      saida.push(resto.slice(0, corte).trimEnd());
      resto = resto.slice(corte).trimStart();
    }
    saida.push(resto);
  }
  return saida;
}

function montarTexto({ titulo, linhas, copias }, larguraMm) {
  const colunas = larguraMm === 58 ? 32 : 48;
  const centro = (s) => " ".repeat(Math.max(0, Math.floor((colunas - s.length) / 2))) + s;
  const via = [
    ...quebrar(titulo, colunas).map(centro),
    "-".repeat(colunas),
    ...linhas.flatMap((l) => quebrar(l, colunas)),
  ].join("\n");
  return Array.from({ length: copias }, () => via).join("\n\n\n\n");
}

// ---------- Envio para a impressora ----------

/** Impressora de rede: ESC/POS direto na porta (normalmente 9100), com corte no final. */
function imprimirRede(texto, endereco, porta) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: endereco, port: porta || 9100 });
    socket.setTimeout(8000, () => socket.destroy(new Error("tempo esgotado ao falar com a impressora")));
    socket.on("error", reject);
    socket.on("connect", () => {
      // ESC @ (reinicia) + texto sem acento + avanço + GS V (corte). Sem acento para não depender da tabela de caracteres.
      const dados = Buffer.concat([
        Buffer.from([0x1b, 0x40]),
        Buffer.from(semAcento(texto) + "\n\n\n\n", "latin1"),
        Buffer.from([0x1d, 0x56, 0x42, 0x00]),
      ]);
      socket.end(dados, resolve);
    });
  });
}

/** Impressora instalada no Windows (USB/Bluetooth): manda o texto pelo driver. */
async function imprimirWindows(texto, nomeImpressora) {
  if (!nomeImpressora) throw new Error("Falta o nome da impressora no Windows (Admin → Impressoras)");
  const arquivo = path.join(tmpdir(), `ticket-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
  await writeFile(arquivo, "﻿" + texto, "utf8");
  try {
    await new Promise((resolve, reject) => {
      execFile(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          "Get-Content -Raw -Encoding UTF8 -LiteralPath $env:TICKET_ARQ | Out-Printer -Name $env:TICKET_IMPRESSORA",
        ],
        { env: { ...process.env, TICKET_ARQ: arquivo, TICKET_IMPRESSORA: nomeImpressora }, timeout: 20000 },
        (erro, _saida, stderr) => (erro ? reject(new Error(stderr?.trim() || erro.message)) : resolve())
      );
    });
  } finally {
    await unlink(arquivo).catch(() => {});
  }
}

async function imprimir(ticket, impressora) {
  const texto = montarTexto(ticket, impressora.larguraMm ?? ticket.larguraMm);
  if (SIMULAR) {
    console.log(`\n===== SIMULAÇÃO (${ticket.titulo}) =====\n${texto}\n=====\n`);
    return;
  }
  if (impressora.conexao === "REDE") {
    if (!impressora.endereco) throw new Error("Falta o IP da impressora (Admin → Impressoras)");
    return imprimirRede(texto, impressora.endereco, impressora.porta);
  }
  return imprimirWindows(texto, impressora.endereco);
}

// ---------- Conversa com o servidor ----------

async function chamar(caminho, opcoes = {}) {
  const res = await fetch(`${APP_URL}${caminho}`, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      // Só se o endereço estiver atrás da proteção da Vercel (veja o LEIAME).
      ...(BYPASS_VERCEL ? { "x-vercel-protection-bypass": BYPASS_VERCEL } : {}),
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    // Só um resumo da resposta: o corpo pode ser uma página HTML inteira ou trazer códigos que mudam a cada chamada.
    const corpo = (await res.text().catch(() => "")).split("\n")[0];
    const resumo = corpo.startsWith("<") ? "(página HTML: a rota não existe neste servidor)" : corpo.slice(0, 120);
    throw new Error(`${res.status} ${resumo}`.trim());
  }
  return res.json();
}

async function ciclo(destino) {
  const { impressora, tickets } = await chamar(`/api/impressao/pendentes?destino=${destino}`);
  for (const ticket of tickets) {
    try {
      await imprimir(ticket, impressora);
      await chamar(`/api/impressao/${ticket.id}/concluir`, { method: "POST", body: JSON.stringify({ ok: true }) });
      log(`[${destino}] impresso: ${ticket.titulo}`);
    } catch (err) {
      log(`[${destino}] ERRO ao imprimir ${ticket.titulo}: ${err.message}`);
      await chamar(`/api/impressao/${ticket.id}/concluir`, {
        method: "POST",
        body: JSON.stringify({ ok: false, erro: err.message }),
      }).catch(() => {});
    }
  }
}

let ultimoErro = "";
async function laco() {
  for (const destino of DESTINOS) {
    try {
      await ciclo(destino);
      if (ultimoErro) log("Conexão com o servidor restabelecida.");
      ultimoErro = "";
    } catch (err) {
      // Só repete a mensagem quando o erro muda, para não encher a tela.
      if (err.message !== ultimoErro) log(`Servidor indisponível (${destino}): ${err.message}`);
      ultimoErro = err.message;
    }
  }
  setTimeout(laco, INTERVALO_MS);
}

log(`Agente de impressão iniciado. Servidor: ${APP_URL} · destinos: ${DESTINOS.join(", ")}${SIMULAR ? " · SIMULAÇÃO" : ""}`);
laco();
