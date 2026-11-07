"""ORM. Importar este pacote registra todas as tabelas no metadata."""

from app.models.analyses import (
    AnalysisModelRow,
    AnalysisPromptModel,
    CompanySettingsModel,
    UserAiSettingsModel,
)
from app.models.api_tokens import ApiTokenModel
from app.models.identity import (
    CompanyModel,
    InvitationModel,
    PasswordResetModel,
    SessionModel,
    UserModel,
)
from app.models.messages import ConversationModel, MessageModel
from app.models.numbers import ChannelConnectionModel, ConnectionAttemptModel

__all__ = [
    "AnalysisModelRow",
    "AnalysisPromptModel",
    "ApiTokenModel",
    "ChannelConnectionModel",
    "CompanyModel",
    "CompanySettingsModel",
    "ConnectionAttemptModel",
    "ConversationModel",
    "InvitationModel",
    "MessageModel",
    "PasswordResetModel",
    "SessionModel",
    "UserAiSettingsModel",
    "UserModel",
]
