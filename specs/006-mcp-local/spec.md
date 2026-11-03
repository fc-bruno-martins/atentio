# Feature Specification: MCP local com token pessoal

**Created**: 2026-11-02 | **Status**: Aprovada pelo usuário | Item 007 do backlog, primeira fatia

Conecta Claude Code e Claude Desktop ao ambiente local. Web e celular dependem de OAuth e HTTPS (Q10, Q17).

- **FR-001**: Usuário e admin da empresa MUST gerar, listar e revogar tokens em Meu perfil; o token aparece uma só vez.
- **FR-002**: Tokens MUST ser guardados só como hash e servir apenas às rotas de leitura do MCP.
- **FR-003**: O MCP MUST expor listar conversas, ler mensagens por período e buscar por texto, só do dono do token.
- **FR-004**: Conta ou empresa desativada e token revogado MUST perder o acesso na chamada seguinte.
- **FR-005**: Administrador da plataforma MUST NOT ter token.
- **FR-006**: O MCP MUST NOT escrever no WhatsApp nem expor dados administrativos ou análises.
