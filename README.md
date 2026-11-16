# Pão e Mar — PDV para padarias e restaurantes

> Sistema de frente de loja: balcão, mesas com atendentes, cozinha, fábrica (encomendas), caixa, estoque e impressão de tickets.

**🔗 Demo:** https://paoemar-ten.vercel.app/
**Status:** desenvolvido para um comércio de Praia do Forte (BA), entra em operação na inauguração, em dezembro de 2026 · código-fonte privado (sistema de cliente)

<!-- Coloque aqui 2 ou 3 prints: tela de venda, mesas, cozinha, fábrica -->
<!-- Arraste a imagem para o editor do GitHub e ele gera o link sozinho -->

## Sumário

1. [O que o sistema faz](#o-que-o-sistema-faz)
2. [Stack e arquitetura](#stack-e-arquitetura)
3. [Cargos e telas](#cargos-e-telas)
4. [Impressão de tickets](#impressão-de-tickets)
5. [Rodar em desenvolvimento](#rodar-em-desenvolvimento)
6. [Variáveis de ambiente](#variáveis-de-ambiente)
7. [Banco de dados: migrações e scripts](#banco-de-dados-migrações-e-scripts)
8. [Deploy (Vercel)](#deploy-vercel)
9. [Solução de problemas](#solução-de-problemas)

## O que o sistema faz

**Atendimento**
- **Venda no balcão (`/pos`):** monta o carrinho, escolhe a forma de pagamento (dinheiro, crédito ou débito com a bandeira, Pix) e cobra na hora.
- **Mesas (`/mesas`):** o garçom se identifica com **PIN** por cima do login do aparelho, abre a mesa, lança os pedidos em **rodadas** e fecha a conta. A taxa de serviço é de 10% e pode ser removida a pedido do cliente. O fechamento aceita desconto ou adicional. A sessão do atendente expira por inatividade (5 minutos). Cancelar um item já lançado exige o PIN de um supervisor.
- **Cozinha (`/cocina`):** quadro em tempo real com os pedidos (Recebido → Em preparo → Pronto → Entregue), alertas de pedido parado e botão para reimprimir o ticket.
- **Caixa (`/caja`):** abertura, fechamento e movimentações de dinheiro.

**Produção por encomenda**
- **Encomendas (`/encomendas`):** cadastro de pedidos para retirada em data e hora combinadas (pães, croissants, tudo que é produzido). O cliente pode ser digitado ou escolhido da lista de **clientes cadastrados** (`/encomendas/clientes`: nome, endereço, telefone, e-mail, CNPJ e observações). Só aparecem os produtos marcados como "Pode ser encomendado".
- **Fábrica (`/fabrica`):** fila das encomendas por data de retirada, em tempo real, com destaque para o que está perto do horário ou atrasado.

**Gestão (`/admin`)**
- **Produtos e categorias:** preço, unidade (un ou kg), estoque, opções e adicionais, e as marcações "Pode ser encomendado", "Imprimir na cozinha" e "Imprimir em produção".
- **Estoque:** insumos, ficha técnica por produto (a venda baixa os insumos) e entrada por nota de compra, manual ou por XML. Alertas de estoque baixo.
- **Atendentes:** cadastro com PIN e permissão de supervisor.
- **Cancelamentos, relatórios** e **Impressoras** (configuração da impressora da Cozinha e da Produção).

**Página inicial pública:** quem não está logado vê uma página de apresentação com contato por WhatsApp e e-mail.

## Stack e arquitetura

| Camada | Tecnologias |
|---|---|
| Aplicação | Next.js 14 (App Router, Server Actions) · React 18 · TypeScript · Tailwind CSS |
| Login e cargos | Clerk (o cargo fica em `publicMetadata.role`) |
| Banco de dados | PostgreSQL (Neon) com Prisma |
| Tempo real | Redis (Upstash) com pub/sub, entregue às telas por Server-Sent Events |
| Impressão | Fila no banco + programa local `agente-impressao` (Node) |
| Deploy | Vercel |

```
Celular do garçom / balcão / caixa (navegador)
        │  Server Actions
        ▼
   Next.js (Vercel) ──► PostgreSQL (Neon)
        │  publica eventos
        ▼
   Redis (Upstash) ──SSE──► telas da Cozinha e da Fábrica

   Next.js grava tickets na fila (TicketImpressao)
        ▲
        │  HTTPS + token (a cada ~2 s)
   agente-impressao (PC da loja) ──► impressora térmica (rede, porta 9100)
```

Pastas principais: `app/` (telas e rotas), `lib/` (regras e utilitários), `components/`, `prisma/` (schema, migrações e scripts de dados) e `agente-impressao/` (programa da loja).

## Cargos e telas

O cargo é definido no dashboard do Clerk, em `publicMetadata.role`. As rotas são protegidas no `middleware.ts` e nos layouts, a partir de `ROUTE_ROLES` em `lib/auth.ts`.

| Tela | Cargos com acesso |
|---|---|
| `/admin` | `admin`, `superadmin` |
| `/pos` | `admin`, `superadmin`, `cajero`, `mostrador` |
| `/caja` | `admin`, `superadmin`, `cajero` |
| `/mesas`, `/comandas`, `/encomendas` | `admin`, `superadmin`, `mostrador` |
| `/cocina` | `admin`, `superadmin`, `cocina` |
| `/fabrica` | `admin`, `superadmin`, `fabrica` |

Para demonstrações, os e-mails em `ADMIN_AUTO_EMAILS` viram `admin` sozinhos no primeiro acesso.

## Impressão de tickets

Os tickets saem **sem nenhuma tela aberta**. O servidor está na internet e a impressora está na rede local da loja, então um programa no computador da loja faz a ponte. São três impressoras configuráveis: **Cozinha**, **Produção** e **Caixa**.

**Fluxo**
1. Ao **lançar uma rodada** nas mesas, fechar uma **venda no balcão** ou criar uma **encomenda**, o servidor grava um ticket na fila para cada impressora que tenha itens marcados. Cada ticket tem uma chave única por pedido e destino, então um reenvio nunca imprime em duplicidade.
2. O `agente-impressao` consulta a fila a cada ~2 segundos, imprime e confirma. Falhas são tentadas de novo (até 5 vezes). Tickets com mais de 30 minutos são descartados.

**Quais itens saem em qual impressora**
- A impressora da **Cozinha** recebe os itens dos produtos marcados "Imprimir na cozinha".
- A impressora da **Produção** recebe os itens marcados "Imprimir em produção" e cada **encomenda** nova (com cliente, telefone, horário de retirada e observações).
- Um produto pode estar marcado nas duas ou em nenhuma. Sem marcação, não gera ticket.
- A impressora do **Caixa** imprime **contas**, não itens de produto:
  - **Pré-conta:** botão "Imprimir pré-conta" na tela da mesa. Sai o que já foi lançado (itens, consumo, serviço, total e valor por pessoa), sem fechar a conta. Itens pendentes, ainda não lançados, não entram. Pode ser impressa quantas vezes for preciso.
  - **Recibo do fechamento:** sai sozinho ao fechar a conta de uma mesa, com desconto ou adicional, forma de pagamento (e bandeira do cartão) e total.
  - Os dois são "não é documento fiscal". Se a impressora do Caixa estiver desativada, o recibo é ignorado e o botão da pré-conta avisa para ativar em Admin → Impressoras.
  - O recibo vale para o fechamento de **mesas**; a venda no balcão e as comandas antigas não imprimem recibo.

**Configurar**
1. Em **Admin → Impressoras**, ative a impressora e informe a conexão: **Rede (IP)** (IP e porta, normalmente 9100, recomendado) ou **USB/Bluetooth** (o nome exato da impressora no Windows). Defina a largura do papel (58 ou 80 mm) e o número de vias. O botão "Imprimir teste" usa o navegador do aparelho.
2. Em **Admin → Produtos**, marque os produtos que devem imprimir.
3. Defina `PRINT_AGENT_TOKEN` na Vercel (uma senha longa e secreta) e faça um novo deploy.
4. No computador da loja, instale o agente (resumo abaixo).

**Instalar o agente (Windows)**
1. Instale o Node.js 18 ou mais novo (de preferência para todos os usuários, em Program Files).
2. Copie a pasta `agente-impressao` para o computador. Copie `.env.example` para `.env` e preencha `APP_URL` (o domínio fixo de produção, sem barra no final), `PRINT_AGENT_TOKEN` (o **mesmo** valor da Vercel) e `DESTINOS` (`COZINHA`, `PRODUCAO` e `CAIXA`, os que este computador atende, separados por vírgula).
3. Teste com `SIMULAR=1` (mostra os tickets na tela, sem imprimir) e depois com `SIMULAR=0`: `node agente.mjs` ou `iniciar.bat`.
4. Para rodar **escondido e iniciar junto com o Windows**, abra o PowerShell como administrador, entre na pasta e rode `.\instalar-servico.ps1`. O que acontece fica em `agente.log`. Para remover: `.\remover-servico.ps1`.

Detalhes e diagnóstico em [`agente-impressao/LEIAME.md`](agente-impressao/LEIAME.md).

**Limites a conhecer**
- O computador da impressora precisa estar **ligado**; só ele alcança a rede local.
- Em impressora de **rede**, o texto sai **sem acentos** (não depende da tabela de caracteres da impressora) e o papel é cortado no fim. Em impressora instalada no Windows, o resultado depende do driver.
- O botão "Imprimir" das telas da Cozinha e da Fábrica usa o diálogo de impressão do navegador, só para reimpressão manual.

## Rodar em desenvolvimento

Requisitos: Node 18+ e contas gratuitas no Neon (PostgreSQL), no Clerk e no Upstash (Redis).

```bash
npm install                 # também roda "prisma generate"
cp .env.example .env        # preencha as variáveis (veja a seção abaixo)
npx prisma migrate deploy   # cria as tabelas
npm run db:seed-mesas       # atendentes de exemplo (PIN aleatório; defina o PIN em Admin → Atendentes)
npm run dev                 # http://localhost:3000
```

Outros comandos: `npm run lint`, `npx tsc --noEmit` e `npm run build`.

> **Windows:** com o `npm run dev` aberto, o `prisma generate` e o `next build` podem falhar com `EPERM` (o servidor segura o motor do Prisma). Pare o servidor antes.

## Variáveis de ambiente

Copie `.env.example` para `.env`. Em produção, cadastre as mesmas variáveis na Vercel (Settings → Environment Variables), marcando **Production** e, se usar deploys de branch, também **Preview**.

| Variável | Para que serve | Obrigatória |
|---|---|---|
| `DATABASE_URL` | Conexão do Neon **com** pooler (a que a aplicação usa) | Sim |
| `DIRECT_URL` | Conexão do Neon **sem** pooler (migrações) | Sim |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Login e cargos (Clerk) | Sim |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Rotas de login e cadastro | Sim |
| `UPSTASH_REDIS_URL` | Redis (`rediss://...`, não a URL REST) para o tempo real | Sim |
| `ATENDENTE_SESSION_SECRET` | Assina a sessão do atendente (PIN). Se vazio, usa o `CLERK_SECRET_KEY` | Recomendada |
| `ADMIN_AUTO_EMAILS` | E-mails que viram `admin` no primeiro acesso (demonstrações) | Não |
| `PRINT_AGENT_TOKEN` | Senha entre o servidor e o programa de impressão. Sem ela, a API de impressão responde 503 | Para imprimir |
| `FOCUSNFE_TOKEN` | Token do Focus NFe para emitir notas fiscais (Admin → Fiscal mostra se está configurado) | Para emitir notas |
| `NEXT_PUBLIC_CONTATO_WHATSAPP`, `NEXT_PUBLIC_CONTATO_EMAIL` | Contatos da página inicial pública | Não |

O programa de impressão tem o próprio `.env` (em `agente-impressao/`), documentado no `LEIAME` dele. **Nunca comite** nenhum `.env`: eles já estão no `.gitignore`.

## Banco de dados: migrações e scripts

**Regra:** o schema só muda por **migração** (`prisma/migrations`). Não use `prisma db push`.

```bash
npx prisma migrate deploy     # aplica as migrações pendentes (produção e desenvolvimento)
npx prisma migrate status     # mostra o que falta aplicar
```

Aplique as migrações **antes** de publicar um código que dependa delas. Todas as migrações até hoje são aditivas.

**Scripts de dados** (em `prisma/`, rodam com `npx tsx`):

| Script | O que faz | Cuidado |
|---|---|---|
| `seed.ts` (`npm run db:seed`) | Catálogo mínimo de demonstração | Cria categorias e produtos; não é idempotente |
| `seed-mesas.ts` (`npm run db:seed-mesas`) | Atendentes de exemplo | Idempotente; PIN aleatório |
| `seed-completo.ts` | Cardápio completo, com adicionais e opções | **Apaga** vendas, comandas e produtos. Só roda com `CONFIRMAR_RESET=sim` |
| `seed-clientes.ts` | Clientes de exemplo das encomendas (dados fictícios) | Idempotente |
| `atualizar-cardapio.ts` | Cria produtos novos da lista, inativos e com preço 0 | Idempotente; não apaga nada |
| `atualizar-precos.ts` | Ajusta preço e unidade pela planilha, cria o que falta e desativa o que saiu do cardápio | Simula por padrão; só grava com `APLICAR=sim`. Desativa, não apaga: o histórico de vendas fica |

Antes de rodar qualquer script contra o banco de produção, confira qual banco o `.env` aponta.

## Deploy (Vercel)

1. Variáveis cadastradas (tabela acima) para **Production** (e **Preview**, se usar deploys de branch).
2. Aplique as migrações no banco **antes** do merge na `main`.
3. Merge na `main`: a Vercel faz o deploy de Production sozinha.
4. Se criar ou alterar uma variável, faça um **Redeploy**: ela só vale para deploys novos.

O build roda lint e checagem de tipos: um `import` não usado ou uma aspa solta em texto de tela **derruba o deploy**. Rode `npm run lint` e `npx tsc --noEmit` antes de subir. Quando o deploy falha, a mensagem real está no log do deploy, acima do resumo final.

## Solução de problemas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Erro ao digitar o PIN: `Falta ATENDENTE_SESSION_SECRET` | Variável ausente ou vazia, e sem `CLERK_SECRET_KEY` no ambiente | Criar `ATENDENTE_SESSION_SECRET` na Vercel e fazer Redeploy |
| Deploy de **Preview** falha em todas as páginas | O ambiente Preview não tem as variáveis (Clerk, banco) | Marcar as variáveis também para Preview |
| Build falha em `next/font` (`Cannot read properties of null`) | Falha passageira ao baixar fontes do Google | Redeploy sem cache; se repetir, embutir as fontes com `next/font/local` |
| Telas novas dão erro em produção | Migração ainda não aplicada | `npx prisma migrate deploy` |
| `prisma generate` / `next build` com `EPERM` no Windows | O `npm run dev` está aberto | Parar o servidor de dev |
| Agente: `401` | `PRINT_AGENT_TOKEN` diferente entre a Vercel e o `.env` do agente | Igualar os dois |
| Agente: `503` | Falta `PRINT_AGENT_TOKEN` na Vercel (ou o redeploy) | Criar a variável e fazer Redeploy |
| Agente: `404` | `APP_URL` errado, ou o deploy ainda não tem o código da impressão | Usar o domínio fixo de produção |
| Agente: `401 Protected by Vercel Authentication` | `APP_URL` é de um deploy específico, protegido pela Vercel | Usar o domínio fixo, ou o bypass (`VERCEL_BYPASS`) |
| Pedido lançado e nada imprime | Impressora inativa, produto sem a caixa de impressão, agente parado ou sem o IP/nome | Conferir Admin → Impressoras, Admin → Produtos e o `agente.log` |

## Meu papel

Desenvolvimento full stack de ponta a ponta: levantamento de requisitos com o cliente, modelagem do banco, interface, regras de negócio, integração com a impressora, deploy e suporte.

---

Desenvolvido por **Santiago Toso** · [LinkedIn](https://www.linkedin.com/in/santiago-javier-toso-cam%C3%B3n) · [GitHub](https://github.com/santiagotoso-hash)
