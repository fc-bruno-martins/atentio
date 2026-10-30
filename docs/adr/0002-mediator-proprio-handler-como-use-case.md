# 0002 — Mediator próprio; handler é o use case

- **Status**: aceito (2026-10-30), revisável se o usuário preferir outra divisão
- **Contexto**: a arquitetura proposta pelo usuário cita "handlers (parecido com mediator),
  usecases, repositories". A relação handler ↔ use case não foi definida (TODO HANDLER_USECASE).
- **Opções**: (a) handler fino que delega a um use case; (b) o handler é o use case; (c) lib de
  mediator de terceiros.
- **Decisão**: (b) com mediator próprio em `judite.shared.mediator`. Cada `Command`/`Query` é um
  dataclass imutável; cada um tem exatamente um handler em `judite.application.<contexto>`, que
  contém a lógica do caso de uso e depende de ports. Apps só chamam `mediator.send(...)`.
- **Consequências**: menos indireção (um arquivo por caso de uso). Se surgir lógica reutilizada
  por vários handlers, ela vai para serviços de domínio, não para "use cases" intermediários.
  Mudar para (a) é mecânico.
