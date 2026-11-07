# ADR 0012: Conectores de saída e publicação só com aprovação humana

**Status**: aceito (2026-11-07)

## Contexto

Até aqui a regra era "a plataforma só lê": nenhum dado sai da Atentio para outro sistema. O
produto passa a apoiar times de Customer Success, e o resultado das análises (resumo e pendências
com o cliente) precisa chegar às ferramentas do time: Notion, Jira, ClickUp e Azure DevOps.

## Decisão

1. **Entrada e saída separadas.** Conectores de entrada (WhatsApp, Slack, Teams, Discord,
   ClickUp) continuam somente leitura. Conectores de saída são destinos de publicação.
2. **Publicação só com aprovação humana.** O último agente do pipeline, o Publicador, monta uma
   proposta e para em "aguardando revisão humana". A pessoa dona da análise aprova (podendo editar
   resumo e itens e escolher destinos) ou descarta. Sem aprovação, nada é publicado, e cada
   análise é publicada no máximo uma vez. A regra é garantida no backend.
3. **MCP como protocolo de saída.** Cada destino é um servidor MCP: handshake (`initialize` e
   `tools/list`) e uma chamada `tools/call` por item (página única no Notion). Tudo fica no rastro
   do agente, visível no Debug do harness.
4. **Simulação até haver credenciais.** O gateway de saída atual (`MockOutputGateway`) imita o
   handshake e a criação dos itens com identificadores no formato de cada ferramenta, e marca toda
   entrega como "simulado". Nada sai da plataforma. As conexões simuladas ficam no navegador e não
   guardam credencial.
5. **WhatsApp de saída bloqueado.** Enviar pelo WhatsApp continua proibido (ADR 0009): risco de
   banimento do número e contrário ao modo somente leitura da conexão.

## Consequências

- Ligar um destino real exige um adapter novo para o port `OutputGateway`, credenciais por
  empresa guardadas com segurança e testes de contrato do destino.
- O rastro da publicação contém resumo e títulos de pendências, que derivam das mensagens:
  ficam na análise e são apagados no mesmo prazo de retenção.
- Constitution 2.3.0: inclui a regra de saída com aprovação humana.
