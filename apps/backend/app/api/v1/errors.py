"""Tradução de erros de domínio para HTTP. Respostas nunca trazem detalhes internos."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.logging import get_logger
from app.domain import errors

log = get_logger(__name__)

STATUS: dict[type[errors.DomainError], int] = {
    errors.InvalidCredentials: 401,
    errors.NotAuthenticated: 401,
    errors.LoginBlocked: 429,
    errors.Forbidden: 403,
    errors.NotFound: 404,
    errors.EmailInUse: 409,
    errors.InvitationAlreadyPending: 409,
    errors.LastAdmin: 409,
    errors.InvalidInvitation: 410,
    errors.InvalidResetLink: 400,
    errors.WrongPassword: 400,
    errors.InvalidValue: 422,
}


async def _domain_error(_: Request, error: Exception) -> JSONResponse:
    assert isinstance(error, errors.DomainError)
    status_code = STATUS.get(type(error), 400)
    return JSONResponse({"code": error.code, "message": error.message}, status_code=status_code)


async def _unexpected_error(_: Request, error: Exception) -> JSONResponse:
    log.error("erro_inesperado", error=type(error).__name__)
    return JSONResponse(
        {"code": "internal_error", "message": "Internal Server Error"}, status_code=500
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(errors.DomainError, _domain_error)
    app.add_exception_handler(Exception, _unexpected_error)
