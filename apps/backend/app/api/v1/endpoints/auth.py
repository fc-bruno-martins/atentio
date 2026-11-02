from fastapi import APIRouter, BackgroundTasks, status

from app.api.v1.dependencies import (
    AccountServiceDep,
    AuthServiceDep,
    ContainerDep,
    RecoveryServiceDep,
    TokenDep,
)
from app.api.v1.endpoints.mappers import me_out
from app.core.logging import get_logger
from app.domain.ports import EmailSender
from app.schemas.identity import LoginIn, PasswordRecoveryIn, PasswordResetIn, SessionOut
from app.services.account import RecoveryEmail

router = APIRouter(prefix="/auth", tags=["auth"])
log = get_logger(__name__)


@router.post("/login")
async def login(data: LoginIn, auth: AuthServiceDep, account: AccountServiceDep) -> SessionOut:
    opened = await auth.login(data.email, data.password)
    profile = await account.profile_of(opened.user)
    return SessionOut(
        token=opened.token, expires_at=opened.session.expires_at, user=me_out(profile)
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(token: TokenDep, auth: AuthServiceDep) -> None:
    await auth.authenticate(token)
    await auth.logout(token)


async def _send_recovery(sender: EmailSender, email: RecoveryEmail) -> None:
    try:
        await sender.send_password_reset(to=email.to, url=email.url)
    except Exception as error:
        log.warning("envio_de_recuperacao_falhou", error=type(error).__name__)


@router.post("/password-recovery", status_code=status.HTTP_202_ACCEPTED)
async def password_recovery(
    data: PasswordRecoveryIn,
    service: RecoveryServiceDep,
    container: ContainerDep,
    tasks: BackgroundTasks,
) -> dict[str, str]:
    email = await service.request(data.email)
    if email is not None:  # envio depois da resposta: o tempo não revela se a conta existe
        tasks.add_task(_send_recovery, container.email, email)
    return {"message": "Se o e-mail estiver cadastrado, enviaremos um link."}


@router.post("/password-reset", status_code=status.HTTP_204_NO_CONTENT)
async def password_reset(data: PasswordResetIn, service: RecoveryServiceDep) -> None:
    await service.reset(data.token, data.password)
