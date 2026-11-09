/**
 * Impressão de tickets pelo navegador: monta o cupom num iframe escondido e abre o
 * diálogo de impressão do sistema (a impressora térmica é escolhida ali).
 */

export type Ticket = {
  titulo: string;
  linhas: string[];
  larguraMm: number;
  copias: number;
};

function escapar(texto: string) {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function cupom({ titulo, linhas }: Ticket) {
  return `<section class="via"><h1>${escapar(titulo)}</h1>${linhas.map((l) => `<p>${escapar(l)}</p>`).join("")}</section>`;
}

export function imprimirTicket(ticket: Ticket) {
  const vias = Array.from({ length: ticket.copias }, () => cupom(ticket)).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: ${ticket.larguraMm}mm auto; margin: 0; }
    body { margin: 0; width: ${ticket.larguraMm}mm; font: 12px/1.35 monospace; color: #000; }
    .via { padding: 3mm; page-break-after: always; }
    .via:last-child { page-break-after: auto; }
    h1 { font-size: 14px; margin: 0 0 2mm; text-align: center; }
    p { margin: 0; white-space: pre-wrap; word-break: break-word; }
  </style></head><body>${vias}</body></html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  iframe.srcdoc = html;
  iframe.onload = () => {
    const janela = iframe.contentWindow;
    if (!janela) return iframe.remove();
    janela.focus();
    janela.print();
    // O diálogo é bloqueante em alguns navegadores e não em outros: remove com folga.
    setTimeout(() => iframe.remove(), 60_000);
  };
  document.body.appendChild(iframe);
}

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function ticketDeTeste(nome: string, larguraMm: number, copias: number): Ticket {
  return {
    titulo: "TESTE DE IMPRESSÃO",
    larguraMm,
    copias,
    linhas: [
      nome,
      dataHora.format(new Date()),
      "-".repeat(larguraMm === 58 ? 28 : 40),
      `Papel ${larguraMm} mm · ${copias} via(s)`,
      "Pão e Mar",
    ],
  };
}
