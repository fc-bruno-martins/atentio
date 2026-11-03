# Quickstart — 003 Conexão de números

Pré-requisitos: `make up`, uma empresa com admin e um usuário, e um WhatsApp de teste no celular. Use
um número que aceite o risco de banimento (Q12).

## Automático

`make check`, com a Evolution API substituída por dublê.

## Manual, com número real

1. Como usuário, abra Números, leia o aviso, peça para conectar e leia o QR. O número aparece
   conectado sem recarregar (US1).
2. Envie e receba mensagens no celular por alguns minutos. Confirme que nada foi enviado, nenhuma
   conversa foi marcada como lida e não há mensagens no banco `evolution` (FR-007, FR-020, SC-004).
3. Encerre o aparelho conectado pelo celular. A situação muda em até 1 minuto (SC-002).
4. Reconecte o mesmo número. A lista continua com um único registro (FR-010).
5. Como admin, veja o número e desconecte-o. O dono vê que foi o admin (FR-012).
6. Reconecte, desative o usuário pela tela Usuários e confirme a desconexão em até 1 minuto
   (SC-005). Reative e confirme que ele continua desconectado.
7. Tente conectar o mesmo número em outra conta com ele conectado. A conexão é recusada sem revelar o
   dono (FR-005).
8. Pare a Evolution API (`docker compose stop evolution-api`). A tela mostra erro claro, e depois de
   2 minutos os números aparecem como não confirmados.
