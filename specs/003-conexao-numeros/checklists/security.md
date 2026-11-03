# Checklist de requisitos: segurança, isolamento e somente leitura

**Purpose**: Avaliar a qualidade dos requisitos da 003 antes do plano
**Created**: 2026-11-02
**Feature**: [spec.md](../spec.md)

`[x]` significa que o revisor considerou o requisito bem escrito, não que ele foi implementado.

## Isolamento

- [x] CHK001 - A visibilidade de cada perfil está definida sem ambiguidade? [Completeness, Spec §FR-014, §FR-015, §FR-017]
- [x] CHK002 - A resposta para número fora do alcance está definida para leitura e para desconexão? [Consistency, Spec §FR-016, US3/AC7]
- [x] CHK003 - O limite entre dados do número e conteúdo de mensagens está explícito? [Clarity, Spec §FR-015, §FR-020]
- [x] CHK004 - A permissão do admin sobre números de outra pessoa está limitada à própria empresa? [Completeness, Spec §FR-012]

## Somente leitura

- [x] CHK005 - As ações proibidas no WhatsApp estão enumeradas? [Clarity, Spec §FR-007]
- [x] CHK006 - O critério de somente leitura pode ser verificado de forma objetiva? [Measurability, Spec §SC-004]

## Conexão e posse do número

- [x] CHK007 - Está definido se número desconectado de uma conta impede outra de conectá-lo? [Ambiguity, Spec §FR-005, Alinhamento A8]
- [x] CHK008 - O limite de 2 números cobre conexão nova e reconexão? [Coverage, Spec §FR-002, §FR-010]
- [x] CHK009 - A recusa de número em uso evita revelar o dono? [Completeness, Spec Edge Cases]
- [x] CHK010 - Está definido o que acontece com conta ou empresa desativada, e na reativação? [Coverage, Spec §FR-013, Edge Cases]

## Falhas

- [x] CHK011 - O comportamento com o serviço de WhatsApp indisponível está definido? [Exception Flow, Spec Edge Cases]
- [x] CHK012 - "Última situação conhecida, marcada como não confirmada" tem critério objetivo de quando marcar? [Clarity, Spec Edge Cases]
- [x] CHK013 - A consulta do QR code está restrita a quem iniciou a tentativa, já que ele dá acesso à conta de WhatsApp? [Gap, Spec §FR-001]

## Notes

- CHK012 e CHK013 reprovaram na revisão e foram corrigidos na spec pelo P.O (Edge Cases e FR-021).
- CHK007 foi resolvido pelo usuário (A8).
