# Agente de impressão (Pão e Mar)

Programa que roda no computador da loja onde a impressora está instalada. Ele busca no sistema os
tickets pendentes (pedidos lançados nas mesas, vendas do balcão e encomendas) e imprime sozinho,
sem precisar de nenhuma tela aberta.

## Instalar (uma vez)

1. Instale o **Node.js 18 ou mais novo** (https://nodejs.org) no computador da impressora.
2. Copie a pasta `agente-impressao` para esse computador.
3. Na pasta, copie `.env.example` para `.env` e preencha:
   - `APP_URL`: endereço do sistema.
   - `PRINT_AGENT_TOKEN`: um texto longo e secreto. **Use o mesmo valor** na variável de ambiente
     `PRINT_AGENT_TOKEN` do servidor (Vercel → Settings → Environment Variables) e refaça o deploy.
   - `DESTINOS`: `COZINHA`, `PRODUCAO` ou os dois, conforme as impressoras ligadas a este computador.
4. No sistema, vá em **Admin → Impressoras**, ative a impressora e preencha:
   - Conexão **USB/Bluetooth** (impressora instalada no Windows): o nome dela **exatamente** como aparece
     em Configurações → Impressoras e scanners.
   - Conexão **Rede (IP)**: o IP e a porta (normalmente 9100).

## Testar sem imprimir

Coloque `SIMULAR=1` no `.env` e rode `node agente.mjs`: os tickets aparecem na tela do programa.
Faça um pedido de teste numa mesa (com um produto marcado "Imprimir na cozinha") e confira.
Depois volte para `SIMULAR=0`.

## Usar no dia a dia

- Rode `iniciar.bat` (duplo clique). Ele reinicia sozinho se cair.
- Para abrir junto com o Windows: `Win + R` → `shell:startup` → coloque um atalho do `iniciar.bat` ali.
- Deixe a janela aberta (pode minimizar).

## Como funciona

- Cada pedido gera um ticket por impressora (cozinha e/ou produção), conforme as caixas
  "Imprimir na cozinha" e "Imprimir em produção" de cada produto.
- O programa consulta o servidor a cada poucos segundos. Se a internet cair, os tickets esperam na fila e saem
  quando voltar (tickets com mais de 30 minutos são descartados, para não imprimir tudo de uma vez).
- Se a impressão falhar (impressora desligada, sem papel), ele tenta de novo, até 5 vezes.
- Em impressora de rede o texto sai **sem acentos**, para não depender da tabela de caracteres dela.
