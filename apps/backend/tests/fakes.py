"""Fakes em memória dos ports, para testes sem banco, rede ou framework."""

from collections.abc import Sequence
from datetime import datetime, timedelta
from uuid import UUID, uuid4

from app.domain.analysis import (
    Analysis,
    AnalysisPrompt,
    CompletionRequest,
    ModelOption,
    UserAiSettings,
)
from app.domain.company import Company
from app.domain.errors import WhatsAppUnavailable
from app.domain.invitation import Invitation, InvitationStatus
from app.domain.message import Conversation, IncomingMessage, Message, UnnamedGroup
from app.domain.number import (
    AttemptStatus,
    ConnectionAttempt,
    DisconnectReason,
    InstanceInfo,
    WhatsAppNumber,
)
from app.domain.password_reset import PasswordReset
from app.domain.session import AuthSession
from app.domain.user import Role, User


class FakeCompanies:
    def __init__(self) -> None:
        self.items: dict[UUID, Company] = {}

    async def add(self, company: Company) -> None:
        self.items[company.id] = company

    async def get(self, company_id: UUID) -> Company | None:
        return self.items.get(company_id)

    get_for_update = get

    async def list_all(self) -> Sequence[Company]:
        return list(self.items.values())

    async def save(self, company: Company) -> None:
        self.items[company.id] = company


class FakeUsers:
    def __init__(self) -> None:
        self.items: dict[UUID, User] = {}

    async def add(self, user: User) -> None:
        self.items[user.id] = user

    async def get(self, user_id: UUID) -> User | None:
        return self.items.get(user_id)

    async def get_by_email(self, email: str) -> User | None:
        return next((u for u in self.items.values() if u.email == email), None)

    async def get_in_company(self, company_id: UUID, user_id: UUID) -> User | None:
        user = self.items.get(user_id)
        return user if user and user.company_id == company_id else None

    async def list_by_company(self, company_id: UUID) -> Sequence[User]:
        return [u for u in self.items.values() if u.company_id == company_id]

    async def lock(self, user_id: UUID) -> None:
        return None

    async def count_active_admins(self, company_id: UUID) -> int:
        return sum(
            1
            for u in self.items.values()
            if u.company_id == company_id and u.is_active and u.role is Role.COMPANY_ADMIN
        )

    async def save(self, user: User) -> None:
        self.items[user.id] = user


class FakeInvitations:
    def __init__(self) -> None:
        self.items: dict[UUID, Invitation] = {}

    async def add(self, invitation: Invitation) -> None:
        self.items[invitation.id] = invitation

    async def get_by_token_hash(self, token_hash: str) -> Invitation | None:
        return next((i for i in self.items.values() if i.token_hash == token_hash), None)

    async def get_pending_by_email(self, email: str) -> Invitation | None:
        return next(
            (
                i
                for i in self.items.values()
                if i.email == email and i.status is InvitationStatus.PENDING
            ),
            None,
        )

    async def get_in_company(self, company_id: UUID, invitation_id: UUID) -> Invitation | None:
        invitation = self.items.get(invitation_id)
        return invitation if invitation and invitation.company_id == company_id else None

    async def list_pending_by_company(self, company_id: UUID) -> Sequence[Invitation]:
        return [
            i
            for i in self.items.values()
            if i.company_id == company_id and i.status is InvitationStatus.PENDING
        ]

    async def save(self, invitation: Invitation) -> None:
        self.items[invitation.id] = invitation


class FakeSessions:
    def __init__(self, users: FakeUsers | None = None) -> None:
        self.items: dict[UUID, AuthSession] = {}
        self._users = users

    async def add(self, session: AuthSession) -> None:
        self.items[session.id] = session

    async def get_by_token_hash(self, token_hash: str) -> AuthSession | None:
        return next((s for s in self.items.values() if s.token_hash == token_hash), None)

    async def save(self, session: AuthSession) -> None:
        self.items[session.id] = session

    async def revoke_for_user(
        self, user_id: UUID, now: datetime, *, except_session: UUID | None = None
    ) -> None:
        for session in self.items.values():
            if session.user_id == user_id and session.id != except_session:
                session.revoke(now)

    async def revoke_for_company(self, company_id: UUID, now: datetime) -> None:
        assert self._users is not None
        members = {u.id for u in await self._users.list_by_company(company_id)}
        for session in self.items.values():
            if session.user_id in members:
                session.revoke(now)


class FakeResets:
    def __init__(self) -> None:
        self.items: dict[UUID, PasswordReset] = {}

    async def add(self, reset: PasswordReset) -> None:
        self.items[reset.id] = reset

    async def get_by_token_hash(self, token_hash: str) -> PasswordReset | None:
        return next((r for r in self.items.values() if r.token_hash == token_hash), None)

    async def save(self, reset: PasswordReset) -> None:
        self.items[reset.id] = reset

    async def invalidate_for_user(self, user_id: UUID, now: datetime) -> None:
        for reset in self.items.values():
            if reset.user_id == user_id and reset.used_at is None:
                reset.used_at = now


class FakeHasher:
    async def hash(self, password: str) -> str:
        return f"hash:{password}"

    async def verify(self, password_hash: str, password: str) -> bool:
        return password_hash == f"hash:{password}"


class FakeTokens:
    def __init__(self) -> None:
        self.count = 0

    def generate(self) -> tuple[str, str]:
        self.count += 1
        token = f"token-{self.count}"
        return token, self.hash(token)

    def hash(self, token: str) -> str:
        return f"sha:{token}"


class FakeThrottle:
    def __init__(self, max_failures: int = 5) -> None:
        self.failures: dict[str, int] = {}
        self.max = max_failures

    async def is_blocked(self, email: str) -> bool:
        return self.failures.get(email, 0) >= self.max

    async def register_failure(self, email: str) -> None:
        self.failures[email] = self.failures.get(email, 0) + 1

    async def reset(self, email: str) -> None:
        self.failures.pop(email, None)


class FakeEmail:
    def __init__(self) -> None:
        self.fail = False
        self.invitations: list[dict[str, str]] = []
        self.resets: list[dict[str, str]] = []

    async def send_invitation(self, *, to: str, company_name: str, url: str) -> None:
        if self.fail:
            raise ConnectionError("smtp fora")
        self.invitations.append({"to": to, "company": company_name, "url": url})

    async def send_password_reset(self, *, to: str, url: str) -> None:
        if self.fail:
            raise ConnectionError("smtp fora")
        self.resets.append({"to": to, "url": url})


class FakeNumbers:
    def __init__(self) -> None:
        self.items: dict[UUID, WhatsAppNumber] = {}

    async def add(self, number: WhatsAppNumber) -> None:
        self.items[number.id] = number

    async def list_by_owner(self, owner_user_id: UUID) -> Sequence[WhatsAppNumber]:
        return [n for n in self.items.values() if n.owner_user_id == owner_user_id]

    async def get_by_owner_and_phone(
        self, owner_user_id: UUID, phone: str
    ) -> WhatsAppNumber | None:
        for number in await self.list_by_owner(owner_user_id):
            if number.phone == phone:
                return number
        return None

    async def count_connected(self, owner_user_id: UUID) -> int:
        return len([n for n in await self.list_by_owner(owner_user_id) if n.is_connected])

    async def get_for_owner(self, owner_user_id: UUID, number_id: UUID) -> WhatsAppNumber | None:
        number = self.items.get(number_id)
        return number if number and number.owner_user_id == owner_user_id else None

    async def get_in_company(self, company_id: UUID, number_id: UUID) -> WhatsAppNumber | None:
        number = self.items.get(number_id)
        return number if number and number.company_id == company_id else None

    async def get_by_instance(self, instance_name: str) -> WhatsAppNumber | None:
        for number in self.items.values():
            if number.instance_name == instance_name:
                return number
        return None

    async def list_by_company(self, company_id: UUID) -> Sequence[WhatsAppNumber]:
        return [n for n in self.items.values() if n.company_id == company_id]

    async def list_connected(self) -> Sequence[WhatsAppNumber]:
        return [n for n in self.items.values() if n.is_connected]

    async def list_without_message_events(self) -> Sequence[WhatsAppNumber]:
        return [n for n in self.items.values() if n.is_connected and not n.message_events_enabled]

    async def list_with_stale_instance(self) -> Sequence[WhatsAppNumber]:
        return [n for n in self.items.values() if not n.is_connected and n.instance_name]

    async def disconnect_for_user(
        self, user_id: UUID, reason: DisconnectReason, now: datetime, by: UUID | None
    ) -> None:
        for number in await self.list_by_owner(user_id):
            number.disconnect(reason, now, by=by)

    async def disconnect_for_company(
        self, company_id: UUID, reason: DisconnectReason, now: datetime
    ) -> None:
        for number in await self.list_by_company(company_id):
            number.disconnect(reason, now)

    async def is_connected_elsewhere(self, phone: str, owner_user_id: UUID) -> bool:
        return any(
            n.phone == phone and n.is_connected and n.owner_user_id != owner_user_id
            for n in self.items.values()
        )

    async def save(self, number: WhatsAppNumber) -> None:
        self.items[number.id] = number


class FakeAttempts:
    def __init__(self) -> None:
        self.items: dict[UUID, ConnectionAttempt] = {}

    async def add(self, attempt: ConnectionAttempt) -> None:
        self.items[attempt.id] = attempt

    async def get_for_user(self, user_id: UUID, attempt_id: UUID) -> ConnectionAttempt | None:
        attempt = self.items.get(attempt_id)
        return attempt if attempt and attempt.user_id == user_id else None

    async def get_by_instance(self, instance_name: str) -> ConnectionAttempt | None:
        for attempt in self.items.values():
            if attempt.instance_name == instance_name:
                return attempt
        return None

    async def list_pending_by_user(self, user_id: UUID) -> Sequence[ConnectionAttempt]:
        return [a for a in self.items.values() if a.user_id == user_id and a.is_pending]

    async def list_expired(self, now: datetime) -> Sequence[ConnectionAttempt]:
        return [a for a in self.items.values() if a.has_expired(now)]

    async def list_with_stale_instance(self) -> Sequence[ConnectionAttempt]:
        closed = (AttemptStatus.REJECTED, AttemptStatus.EXPIRED, AttemptStatus.CANCELLED)
        return [a for a in self.items.values() if a.status in closed and not a.instance_removed]

    async def cancel_pending_for_user(self, user_id: UUID) -> None:
        for attempt in await self.list_pending_by_user(user_id):
            attempt.cancel()

    async def cancel_pending_for_company(self, company_id: UUID) -> None:
        for attempt in self.items.values():
            if attempt.company_id == company_id and attempt.is_pending:
                attempt.cancel()

    async def save(self, attempt: ConnectionAttempt) -> None:
        self.items[attempt.id] = attempt


class FakeWhatsApp:
    """Dublê do gateway: `instances` guarda o que a Evolution API responderia."""

    QR = "data:image/png;base64,QR"

    def __init__(self) -> None:
        self.instances: dict[str, InstanceInfo] = {}
        self.deleted: list[str] = []
        self.logged_out: list[str] = []
        self.message_events: list[str] = []
        self.group_names: dict[str, str] = {}
        self.available = True

    def _check(self) -> None:
        if not self.available:
            raise WhatsAppUnavailable()

    def scan(self, name: str, jid: str) -> None:
        self.instances[name] = InstanceInfo("open", jid)

    async def create_instance(self, name: str) -> str | None:
        self._check()
        self.instances[name] = InstanceInfo("connecting", None)
        return self.QR

    async def enable_message_events(self, name: str) -> None:
        self._check()
        self.message_events.append(name)

    async def get_group_name(self, name: str, group_jid: str) -> str | None:
        self._check()
        return self.group_names.get(group_jid)

    async def get_qr(self, name: str) -> str | None:
        self._check()
        instance = self.instances.get(name)
        return self.QR if instance and instance.state == "connecting" else None

    async def get_instance(self, name: str) -> InstanceInfo | None:
        self._check()
        return self.instances.get(name)

    async def logout(self, name: str) -> None:
        self._check()
        self.logged_out.append(name)

    async def delete(self, name: str) -> None:
        self._check()
        self.deleted.append(name)
        self.instances.pop(name, None)


class FakeMessages:
    def __init__(self) -> None:
        self.conversations: dict[UUID, Conversation] = {}
        self.items: dict[tuple[UUID, str], Message] = {}

    async def store(self, number: WhatsAppNumber, message: IncomingMessage) -> bool:
        if (number.id, message.external_id) in self.items:
            return False
        conversation = next(
            (
                c
                for c in self.conversations.values()
                if c.number_id == number.id and c.remote_jid == message.remote_jid
            ),
            None,
        )
        if conversation is None:
            conversation = Conversation(
                id=uuid4(),
                number_id=number.id,
                remote_jid=message.remote_jid,
                kind=message.kind,
                name=message.contact_name,
                last_message_at=message.sent_at,
                owner_user_id=number.owner_user_id,
            )
            self.conversations[conversation.id] = conversation
        self.items[(number.id, message.external_id)] = Message(
            id=uuid4(),
            conversation_id=conversation.id,
            from_me=message.from_me,
            sender_name=message.sender_name,
            type=message.type,
            text=message.text,
            sent_at=message.sent_at,
        )
        return True

    async def list_conversations(
        self,
        owner_user_id: UUID,
        *,
        channel: str | None = None,
        connection_id: UUID | None = None,
    ) -> Sequence[Conversation]:
        return [
            c
            for c in self.conversations.values()
            if c.owner_user_id == owner_user_id
            and (channel is None or c.channel == channel)
            and (connection_id is None or c.number_id == connection_id)
        ]

    async def get_conversation(
        self, owner_user_id: UUID, conversation_id: UUID
    ) -> Conversation | None:
        found = self.conversations.get(conversation_id)
        return found if found and found.owner_user_id == owner_user_id else None

    async def list_messages(
        self,
        conversation_id: UUID,
        *,
        since: datetime | None,
        until: datetime | None,
        limit: int,
    ) -> Sequence[Message]:
        rows = [
            m
            for m in self.items.values()
            if m.conversation_id == conversation_id
            and (since is None or m.sent_at >= since)
            and (until is None or m.sent_at < until)
        ]
        return sorted(rows, key=lambda m: m.sent_at)[-limit:]

    async def list_unnamed_groups(self, limit: int) -> Sequence[UnnamedGroup]:
        return []

    async def set_conversation_name(self, conversation_id: UUID, name: str) -> None:
        self.conversations[conversation_id].name = name

    async def list_by_ids(
        self, conversation_id: UUID, message_ids: Sequence[UUID]
    ) -> Sequence[Message]:
        rows = [
            m
            for m in self.items.values()
            if m.conversation_id == conversation_id and m.id in message_ids
        ]
        return sorted(rows, key=lambda m: m.sent_at)

    async def purge_expired(self, now: datetime, default_days: int) -> int:
        cutoff = now - timedelta(days=default_days)
        expired = [k for k, m in self.items.items() if m.sent_at < cutoff]
        for key in expired:
            del self.items[key]
        return len(expired)


class FakeAnalyses:
    def __init__(self) -> None:
        self.items: dict[UUID, Analysis] = {}

    async def add(self, analysis: Analysis) -> None:
        self.items[analysis.id] = analysis

    async def list_by_owner(self, owner_user_id: UUID) -> Sequence[Analysis]:
        return [a for a in self.items.values() if a.owner_user_id == owner_user_id]

    async def get_for_owner(self, owner_user_id: UUID, analysis_id: UUID) -> Analysis | None:
        found = self.items.get(analysis_id)
        return found if found and found.owner_user_id == owner_user_id else None


class FakePrompts:
    def __init__(self) -> None:
        self.items: dict[UUID, AnalysisPrompt] = {}

    async def add(self, prompt: AnalysisPrompt) -> None:
        self.items[prompt.id] = prompt

    async def list_by_owner(self, owner_user_id: UUID) -> Sequence[AnalysisPrompt]:
        return [p for p in self.items.values() if p.owner_user_id == owner_user_id]

    async def get_for_owner(self, owner_user_id: UUID, prompt_id: UUID) -> AnalysisPrompt | None:
        found = self.items.get(prompt_id)
        return found if found and found.owner_user_id == owner_user_id else None

    async def delete(self, prompt_id: UUID) -> None:
        del self.items[prompt_id]


class FakeSettings:
    def __init__(self) -> None:
        self.ai: dict[UUID, UserAiSettings] = {}
        self.retention: dict[UUID, int] = {}

    async def get_ai_settings(self, user_id: UUID) -> UserAiSettings | None:
        return self.ai.get(user_id)

    async def save_ai_settings(self, settings: UserAiSettings) -> None:
        self.ai[settings.user_id] = settings

    async def get_retention_days(self, company_id: UUID) -> int | None:
        return self.retention.get(company_id)

    async def save_retention_days(self, company_id: UUID, days: int) -> None:
        self.retention[company_id] = days


class FakeAnalysisModel:
    def __init__(self) -> None:
        self.requests: list[CompletionRequest] = []
        self.error: Exception | None = None

    async def complete(self, request: CompletionRequest) -> str:
        self.requests.append(request)
        if self.error:
            raise self.error
        return "resultado da analise"

    async def list_models(self) -> Sequence[ModelOption]:
        return [ModelOption("modelo/padrao", "Padrao"), ModelOption("modelo/y", "Y", 1.0, 2.0)]
