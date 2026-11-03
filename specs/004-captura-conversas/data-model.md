# Data Model — 004

Migração `0005_messages`. `whatsapp_numbers` ganha `message_events_enabled`.

**conversations**: id, company_id, owner_user_id, number_id, remote_jid, kind (`direct`, `group`),
name (nulo), last_message_at. Único: `(number_id, remote_jid)`. Índice: `(owner_user_id, last_message_at)`.

**messages**: id, company_id, owner_user_id, number_id, conversation_id, external_id, from_me,
sender_jid, sender_name, type (`text`, `image`, `audio`, `video`, `document`, `sticker`, `other`), text,
sent_at. Único: `(number_id, external_id)`. Índices: `(conversation_id, sent_at)`, `(sent_at)`.
