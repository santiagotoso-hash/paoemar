import Link from "next/link";
import {
  BellRingIcon,
  CheckIcon,
  ChefHatIcon,
  ClipboardListIcon,
  CroissantIcon,
  MailIcon,
  MessageCircleIcon,
  PackageIcon,
  StoreIcon,
  UtensilsCrossedIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Contato comercial: dá para trocar pelas variáveis de ambiente sem mexer no código.
const WHATSAPP = (process.env.NEXT_PUBLIC_CONTATO_WHATSAPP ?? "5571999991778").replace(/\D/g, "");
const EMAIL = process.env.NEXT_PUBLIC_CONTATO_EMAIL ?? "santiagotoso@gmail.com";
const MENSAGEM = "Olá! Vi o Pão e Mar e quero saber mais para o meu negócio.";
const LINK_WHATSAPP = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(MENSAGEM)}`;
const LINK_EMAIL = `mailto:${EMAIL}?subject=${encodeURIComponent("Quero conhecer o Pão e Mar")}&body=${encodeURIComponent(MENSAGEM)}`;

const RECURSOS: { icon: LucideIcon; titulo: string; texto: string }[] = [
  {
    icon: ClipboardListIcon,
    titulo: "Mesas e comandas",
    texto: "Abra a mesa, lance rodadas de pedidos pelo celular do garçom e feche a conta com desconto ou adicional.",
  },
  {
    icon: ChefHatIcon,
    titulo: "Cozinha ao vivo",
    texto: "Cada pedido aparece na tela da cozinha na hora, de recebido a entregue, sem papelzinho nem grito.",
  },
  {
    icon: StoreIcon,
    titulo: "Venda no balcão",
    texto: "Monte o carrinho, escolha a forma de pagamento — dinheiro, cartão ou Pix — e cobre em segundos.",
  },
  {
    icon: WalletIcon,
    titulo: "Caixa sob controle",
    texto: "Abertura, fechamento e movimentações de dinheiro registradas, com histórico de cancelamentos.",
  },
  {
    icon: PackageIcon,
    titulo: "Estoque e ficha técnica",
    texto: "Cadastre insumos, monte a ficha técnica de cada produto e dê entrada por nota de compra, manual ou XML.",
  },
  {
    icon: BellRingIcon,
    titulo: "Alertas e relatórios",
    texto: "Aviso de estoque baixo, pedidos parados e relatórios de vendas para decidir com número, não com palpite.",
  },
];

const PASSOS = [
  "O garçom abre a mesa e lança os pedidos direto do celular ou do tablet.",
  "A cozinha recebe tudo em tempo real e avança cada pedido até a entrega.",
  "Ao fechar a conta, o pagamento entra no caixa e o estoque dá baixa pelos insumos usados.",
  "O gestor acompanha vendas, caixa e estoque por relatórios e alertas, de onde estiver.",
];

const SEGMENTOS: { icon: LucideIcon; nome: string }[] = [
  { icon: CroissantIcon, nome: "Padarias e confeitarias" },
  { icon: UtensilsCrossedIcon, nome: "Restaurantes" },
  { icon: StoreIcon, nome: "Cafés e lanchonetes" },
  { icon: ChefHatIcon, nome: "Dark kitchens" },
];

const PERFIS = [
  {
    titulo: "Para o gestor",
    itens: [
      "Caixa e vendas do dia em um só lugar",
      "Autorização do supervisor para cancelamentos",
      "Alertas de estoque baixo e de pedido parado",
      "Cargos com acesso só ao que cada pessoa precisa",
    ],
  },
  {
    titulo: "Para a equipe",
    itens: [
      "Garçom lança pedidos sem sair do salão",
      "Cozinha vê a fila de pedidos em tempo real",
      "Balcão cobra rápido, sem tela complicada",
      "Funciona no navegador do celular, sem instalar app",
    ],
  },
];

const PERGUNTAS = [
  {
    pergunta: "Preciso instalar alguma coisa?",
    resposta: "Não. O Pão e Mar funciona no navegador do computador, do tablet ou do celular.",
  },
  {
    pergunta: "Posso controlar quem acessa o quê?",
    resposta:
      "Sim. Cada pessoa entra com o seu usuário e um cargo — admin, caixa, garçom ou cozinha — e só vê as telas do seu trabalho.",
  },
  {
    pergunta: "Como o estoque é atualizado?",
    resposta:
      "As entradas vêm das notas de compra (digitadas ou por XML) e a baixa acontece pela ficha técnica de cada produto vendido.",
  },
  {
    pergunta: "Quais formas de pagamento posso registrar?",
    resposta: "Dinheiro, cartão (com a bandeira) e Pix, além de desconto ou adicional no fechamento da conta.",
  },
];

function BotoesContato({ centrado = false }: { centrado?: boolean }) {
  return (
    <div className={`mt-8 flex flex-wrap items-center gap-3 ${centrado ? "justify-center" : ""}`}>
      <Button
        size="lg"
        render={
          <a href={LINK_WHATSAPP} target="_blank" rel="noopener noreferrer">
            <MessageCircleIcon className="size-5" aria-hidden />
            Falar no WhatsApp
          </a>
        }
      />
      <a
        href={LINK_EMAIL}
        className="inline-flex items-center gap-2 px-2 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <MailIcon className="size-4" aria-hidden />
        ou mande um e-mail →
      </a>
    </div>
  );
}

// Ilustração: uma mesa e um pedido na cozinha, como aparecem no app.
function Ilustracao() {
  const itens = [
    ["2×", "Pão de fermentação natural"],
    ["1×", "Moqueca de peixe"],
    ["2×", "Suco de caju"],
  ];
  return (
    <div
      role="img"
      aria-label="Exemplo do aplicativo: a comanda da mesa 7 com três itens e um pedido que a cozinha acabou de marcar como pronto."
      className="flex flex-col gap-4"
    >
      <div className="rounded-2xl border bg-card p-5 shadow-xl shadow-primary/10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent px-3 py-1 text-sm font-medium text-primary">Mesa 7</span>
          <span className="text-sm text-muted-foreground">aberta há 24 min</span>
        </div>
        <p className="mb-2 mt-3.5 font-semibold">Comanda · 2ª rodada</p>
        <ul className="flex flex-col gap-1.5 text-sm">
          {itens.map(([qtd, nome]) => (
            <li key={nome} className="flex gap-2">
              <span className="w-6 text-muted-foreground">{qtd}</span>
              {nome}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t pt-3 text-sm">
          <span className="text-muted-foreground">Pagamento: Pix</span>
          <strong>Total R$ 148,00</strong>
        </div>
      </div>
      <div className="max-w-sm self-end rounded-2xl border bg-card p-4 shadow-xl shadow-primary/10">
        <p className="mb-1.5 text-sm text-muted-foreground">Cozinha · Mesa 7</p>
        <p className="text-sm">Moqueca de peixe — sem coentro</p>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
          <CheckIcon className="size-4" aria-hidden />
          Pronto para entregar
        </span>
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2">
          <div>
            <span className="inline-flex rounded-full bg-accent px-3 py-1 text-sm font-medium text-primary">
              Ponto de venda para padaria e restaurante
            </span>
            <h1 className="mt-5 text-balance text-4xl font-semibold leading-tight sm:text-5xl">
              Do pedido na mesa ao caixa, tudo no mesmo lugar.
            </h1>
            <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-muted-foreground">
              O Pão e Mar liga o salão, a cozinha, o balcão e o estoque. O garçom lança, a cozinha prepara, o caixa
              fecha — no computador ou no celular.
            </p>
            <BotoesContato />
            <div className="mt-2 flex items-center gap-4 text-sm">
              <a href="#como-funciona" className="font-medium text-muted-foreground hover:text-foreground">
                Como funciona ↓
              </a>
              <Link href="/sign-in" className="font-medium text-primary hover:underline">
                Já tenho acesso
              </Link>
            </div>
          </div>
          <Ilustracao />
        </section>

        <section className="border-y bg-card">
          <div className="mx-auto grid max-w-6xl gap-x-6 gap-y-8 px-6 py-16 sm:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map(({ icon: Icon, titulo, texto }) => (
              <div key={titulo}>
                <span className="inline-flex rounded-lg bg-accent p-2.5 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h2 className="mt-4 text-base font-semibold">{titulo}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-center text-2xl font-semibold">Como funciona</h2>
          <ol className="mt-8 flex flex-col gap-4">
            {PASSOS.map((passo, i) => (
              <li key={passo} className="flex items-start gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <p className="mt-1 leading-relaxed text-muted-foreground">{passo}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y bg-card">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-center text-2xl font-semibold">Onde o Pão e Mar se aplica</h2>
            <p className="mt-2 text-center text-muted-foreground">
              Para qualquer negócio de alimentação que atende no salão e no balcão.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-2.5">
              {SEGMENTOS.map(({ icon: Icon, nome }) => (
                <span key={nome} className="inline-flex items-center gap-2 rounded-full border bg-background px-3.5 py-2 text-sm">
                  <Icon className="size-[18px] text-primary" aria-hidden />
                  {nome}
                </span>
              ))}
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {PERFIS.map(({ titulo, itens }) => (
                <div key={titulo} className="rounded-xl border bg-background p-5">
                  <h3 className="mb-3 text-base font-semibold">{titulo}</h3>
                  <ul className="flex flex-col gap-2.5">
                    {itens.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[0.95rem] text-muted-foreground">
                        <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-center text-2xl font-semibold">Perguntas frequentes</h2>
          <div className="mt-7 flex flex-col gap-2.5">
            {PERGUNTAS.map(({ pergunta, resposta }) => (
              <details key={pergunta} className="rounded-[10px] border bg-card px-4 py-3.5">
                <summary className="cursor-pointer font-semibold">{pergunta}</summary>
                <p className="mt-2.5 leading-relaxed text-muted-foreground">{resposta}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="border-y bg-card">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center">
            <h2 className="text-balance text-2xl font-semibold">Quer ver o Pão e Mar funcionando no seu negócio?</h2>
            <p className="mt-2 text-muted-foreground">Mostramos o sistema com o seu cardápio e a sua equipe.</p>
            <BotoesContato centrado />
          </div>
        </section>
      </main>

      <footer className="px-6 pb-8 pt-10 text-center text-sm text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <span>Desenvolvido por</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/litocode-logo.svg" alt="litocode — desenvolvimento full stack" className="h-9 w-auto" />
        </div>
        <p className="mt-5">© {new Date().getFullYear()} Pão e Mar</p>
      </footer>
    </div>
  );
}
