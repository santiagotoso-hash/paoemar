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
   - `DESTINOS`: `COZINHA`, `PRODUCAO`, `CAIXA` ou mais de um (separados por vírgula), conforme as impressoras ligadas a este computador. Um destino sem impressora ativa em Admin → Impressoras é ignorado.
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

## Rodar escondido, sem janela (recomendado)

Em vez do `iniciar.bat`, instale o programa como tarefa do Windows: ele roda em segundo plano, inicia
sozinho quando o computador liga (sem precisar fazer login) e reinicia se cair.

1. Feche o `iniciar.bat`, se estiver aberto.
2. Abra o PowerShell **como administrador** (botão direito → Executar como administrador).
3. Entre na pasta e instale:
   ```
   cd "C:\caminho\para\agente-impressao"
   .\instalar-servico.ps1
   ```
4. Pronto. Para acompanhar o que acontece, abra o arquivo `agente.log` (na mesma pasta).
5. Para desinstalar: `.\remover-servico.ps1` (também como administrador).

Observações:
- O computador precisa estar **ligado** (a impressora está na rede local, e só ele a alcança).
- Use a conexão **Rede (IP)** em Admin → Impressoras: a tarefa roda como sistema, sem usuário logado.
- Se mudar o `.env`, reinicie a tarefa (PowerShell como administrador):
  ```
  Stop-ScheduledTask -TaskName AgenteImpressaoPaoeMar
  Start-ScheduledTask -TaskName AgenteImpressaoPaoeMar
  ```

## Como funciona

- Cada pedido gera um ticket por impressora (cozinha e/ou produção), conforme as caixas
  "Imprimir na cozinha" e "Imprimir em produção" de cada produto.
- O programa consulta o servidor a cada poucos segundos. Se a internet cair, os tickets esperam na fila e saem
  quando voltar (tickets com mais de 30 minutos são descartados, para não imprimir tudo de uma vez).
- Se a impressão falhar (impressora desligada, sem papel), ele tenta de novo, até 5 vezes.
- Em impressora de rede o texto sai **sem acentos**, para não depender da tabela de caracteres dela.
