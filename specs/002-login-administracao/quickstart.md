# Quickstart — 002

```bash
make up
make create-platform-admin EMAIL=voce@empresa.com NAME="Seu Nome"   # pede a senha
open http://localhost:8180        # plataforma
open http://localhost:8125        # caixa de e-mail local (Mailpit)
```

| Cenário | Como verificar |
|---|---|
| US1 | Entrar, ver menus do perfil, sair; área privada volta ao login |
| US1.6 | 5 senhas erradas → bloqueio na sexta tentativa |
| US2 | Criar empresa, abrir o convite no Mailpit e aceitar |
| US2.2 | Desativar a empresa com o admin logado → próxima ação cai no login |
| US3 | Convidar usuário, aceitar e confirmar o isolamento com uma segunda empresa |
| US4 | Trocar senha; recuperar senha pelo link do Mailpit |
| Regressão | Cenários do quickstart da 001. Status agora em `/status` (tela) e `GET /api/v1/platform/status` (com sessão) |

`make check` percorre cada serviço e o frontend.
