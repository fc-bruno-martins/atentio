"""Envio de e-mail por SMTP."""

from email.message import EmailMessage

import aiosmtplib

from app.core.config import Settings


class SmtpEmailSender:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def send_invitation(self, *, to: str, company_name: str, url: str) -> None:
        await self._send(
            to,
            f"Convite para a {company_name} na Atentio",
            f"Você foi convidado para a empresa {company_name} na Atentio.\n\n"
            f"Crie sua conta por este link, válido por {self._settings.invitation_ttl_days} dias:"
            f"\n{url}\n",
        )

    async def send_password_reset(self, *, to: str, url: str) -> None:
        await self._send(
            to,
            "Redefinição de senha da Atentio",
            "Recebemos um pedido para redefinir sua senha na Atentio.\n\n"
            f"Defina uma nova senha por este link, válido por "
            f"{self._settings.password_reset_ttl_minutes} minutos:\n{url}\n\n"
            "Se não foi você, ignore este e-mail.\n",
        )

    async def _send(self, to: str, subject: str, body: str) -> None:
        settings = self._settings
        message = EmailMessage()
        message["From"] = settings.smtp_from
        message["To"] = to
        message["Subject"] = subject
        message.set_content(body)
        password = settings.smtp_password.get_secret_value() if settings.smtp_password else None
        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user or None,
            password=password or None,
            start_tls=settings.smtp_tls,
            timeout=10,
        )
