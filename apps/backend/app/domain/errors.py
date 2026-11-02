"""Erros de negócio. A camada de API os traduz para HTTP."""


class DomainError(Exception):
    code = "domain_error"
    message = "Operação inválida."

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or self.message)
        self.message = message or self.message


class InvalidCredentials(DomainError):
    code = "invalid_credentials"
    message = "E-mail ou senha incorretos."


class LoginBlocked(DomainError):
    code = "login_blocked"
    message = "Muitas tentativas. Tente novamente em alguns minutos."


class NotAuthenticated(DomainError):
    code = "not_authenticated"
    message = "Sessão inválida ou expirada."


class Forbidden(DomainError):
    code = "forbidden"
    message = "Você não tem permissão para esta ação."


class NotFound(DomainError):
    code = "not_found"
    message = "Registro não encontrado."


class EmailInUse(DomainError):
    code = "email_in_use"
    message = "Este e-mail já está em uso."


class InvitationAlreadyPending(DomainError):
    code = "invitation_pending"
    message = "Já existe um convite pendente para este e-mail. Reenvie o convite existente."


class InvalidInvitation(DomainError):
    code = "invalid_invitation"
    message = "Este convite é inválido, expirou ou já foi usado. Peça um novo ao admin."


class InvalidResetLink(DomainError):
    code = "invalid_reset_link"
    message = "Este link é inválido ou expirou. Peça um novo."


class LastAdmin(DomainError):
    code = "last_admin"
    message = "A empresa precisa manter ao menos um admin ativo."


class WrongPassword(DomainError):
    code = "wrong_password"
    message = "A senha atual está incorreta."


class InvalidValue(DomainError):
    code = "invalid_value"
    message = "Valor inválido."
