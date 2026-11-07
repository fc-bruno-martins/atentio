# Atentio — Pitch deck (gestores de CS)

**Atentio é o copiloto agêntico do gestor de Customer Success: lê as conversas com os clientes, aponta quem precisa de atenção e mantém o relacionamento em dia.**

- Deck para apresentar: [`pitch-deck.pdf`](pitch-deck.pdf) (11 slides, 16:9), gerado a partir de [`pitch-deck.html`](pitch-deck.html).
- Na plataforma: menu **Pitch**. Aperte **T** para o modo telão e use **←** e **→** para passar os slides. No último slide, **→** segue para o Business Model Canvas.
- Canvas completo, com os 9 blocos e os concorrentes: [`business-model-canvas.pdf`](business-model-canvas.pdf).

O texto dos slides também está em `apps/frontend/src/features/business/services/content.ts`. Ao mudar um, mude os outros.

## Roteiro

### 1. Capa

**Atentio** · O copiloto agêntico do gestor de Customer Success · *Nenhum cliente esquecido.*

> Fala: apresente o nome e a promessa em uma frase.

### 2. Imagine

**"Você cuida de 80 contas. Qual delas está esperando resposta desde ontem?"**

> Fala: faça a pergunta e espere um segundo. É o gancho.

### 3. Problema: o relacionamento se perde no volume

- O gestor de CS conversa com dezenas de clientes ao mesmo tempo.
- As conversas estão espalhadas em grupos de WhatsApp e canais de Slack.
- Pedidos, reclamações e sinais de risco se perdem no meio das mensagens.
- O cliente percebe antes do gestor.

### 4. Solução: conecte os canais e pergunte ao agente

- **Quem espera resposta?** "Quais clientes estão sem resposta hoje?"
- **Resumo por conta.** "Resuma o grupo da conta X desta semana."
- **Sinais de risco.** "Algum cliente demonstrou insatisfação?"

As conversas chegam numa caixa única. O agente responde sob demanda, na plataforma e no Claude, via MCP.

### 5. Como funciona: da conversa à tarefa, com uma pessoa no controle

1. **Conectores:** WhatsApp hoje; Slack, Teams, Discord e ClickUp em seguida. Só leitura.
2. **Agentes:** coletor, extrator, analista e estruturador leem e organizam a conversa.
3. **Revisão humana:** o publicador propõe resumo e pendências; a pessoa aprova, edita ou descarta.
4. **Destinos:** Notion, Jira, ClickUp e Azure DevOps, por MCP. E o Claude consulta tudo.

> Fala: aqui cabe a demonstração ao vivo (Análises, Debug do harness e aprovação do Publicador).

### 6. Diferencial: onde o cliente já fala

- Sem migrar canal: o cliente continua no WhatsApp e no Slack.
- Zero digitação: nenhum CRM para preencher.
- Somente leitura: a Atentio nunca envia mensagem em nome do gestor.
- Nada é publicado sem aprovação humana.

### 7. Para quem: gestores de Customer Success B2B

- **Times de 5 a 50 pessoas**, que atendem clientes em diversos conectores.
- **A dor:** pedidos e riscos perdidos no volume de mensagens.
- **O ganho:** saber quem precisa de atenção hoje, sem ler tudo.

### 8. Modelo de negócio: assinatura, com piloto assistido

- **Receita:** assinatura por gestor conectado ou plano por empresa.
- **Canais:** venda direta ao head de CS, comunidades de CS e o conector no Claude.
- **Custos:** infraestrutura por conta conectada, consumo de IA por análise e implantação.

Preços e canais são hipóteses a validar no piloto.

### 9. Concorrência: ninguém lê a conversa por conta

- **Plataformas de CS** (Gainsight, ChurnZero, SenseData): dependem de CRM e de dados preenchidos.
- **Caixas omnichannel** (Blip, Zenvia, Octadesk): foco em atender e enviar, não no relacionamento.
- **Alternativa atual** (celular, planilha e memória): custo zero, mas pedidos se perdem.

O Atentio lê as conversas onde o cliente já fala, sem migrar canal e sem ninguém digitar nada.

### 10. Onde estamos: MVP funcionando

- Plataforma multiempresa, com dados isolados por empresa.
- WhatsApp conectado por QR code, com captura das conversas.
- Estúdio de análises com cinco agentes e o rastro de cada etapa.
- Servidor MCP para consultar as conversas pelo Claude.
- Publicação nos destinos com aprovação humana, ainda em modo simulado.

### 11. Nosso pedido

**Indicação de 3 times de CS para um piloto de 30 dias.**

> Fala: termine no pedido e abra para perguntas.
