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


class NumberLimitReached(DomainError):
    code = "number_limit"
    message = "Você já tem 2 números conectados. Desconecte um para conectar outro."


class WhatsAppUnavailable(DomainError):
    code = "whatsapp_unavailable"
    message = "O conector do WhatsApp está indisponível no momento. Tente novamente."


class NumberAlreadyConnected(DomainError):
    code = "number_in_use"
    message = "Este número já está conectado a outra conta."


class AttemptClosed(DomainError):
    code = "attempt_closed"
    message = "Esta tentativa de conexão já terminou."


class InvalidPeriod(DomainError):
    code = "invalid_period"
    message = "A data inicial precisa ser anterior à final."


class AnalysisNotConfigured(DomainError):
    code = "analysis_not_configured"
    message = "As análises ainda não foram configuradas nesta plataforma."


class NoModelSelected(DomainError):
    code = "no_model"
    message = "Escolha um modelo para analisar."


class ModelNotAvailable(DomainError):
    code = "model_not_available"
    message = "Este modelo não está disponível. Escolha outro."


class NoMessagesToAnalyze(DomainError):
    code = "no_messages"
    message = "Não há mensagens no período ou na seleção."


class AnalysisModelFailed(DomainError):
    code = "analysis_failed"
    message = "O provedor de análise não respondeu. Tente novamente."


class InvalidValue(DomainError):
    code = "invalid_value"
    message = "Valor inválido."
