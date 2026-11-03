"""Implementam os ports de análises. Models do ORM não saem deste módulo."""

from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.analysis import Analysis, AnalysisPrompt, AnalysisStatus, UserAiSettings
from app.models import (
    AnalysisModelRow,
    AnalysisPromptModel,
    CompanySettingsModel,
    UserAiSettingsModel,
)

HISTORY_LIMIT = 100


def _analysis(m: AnalysisModelRow) -> Analysis:
    return Analysis(
        id=m.id,
        company_id=m.company_id,
        owner_user_id=m.owner_user_id,
        conversation_id=m.conversation_id,
        prompt_text=m.prompt_text,
        model=m.model,
        status=AnalysisStatus(m.status),
        result=m.result,
        message_count=m.message_count,
        created_at=m.analyzed_at,
    )


def _prompt(m: AnalysisPromptModel) -> AnalysisPrompt:
    return AnalysisPrompt(m.id, m.company_id, m.owner_user_id, m.title, m.body)


class SqlAnalysisRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def add(self, analysis: Analysis) -> None:
        self._db.add(
            AnalysisModelRow(
                id=analysis.id,
                company_id=analysis.company_id,
                owner_user_id=analysis.owner_user_id,
                conversation_id=analysis.conversation_id,
                prompt_text=analysis.prompt_text,
                model=analysis.model,
                status=analysis.status.value,
                result=analysis.result,
                message_count=analysis.message_count,
                analyzed_at=analysis.created_at,
            )
        )
        await self._db.flush()

    async def list_by_owner(self, owner_user_id: UUID) -> Sequence[Analysis]:
        rows = await self._db.scalars(
            select(AnalysisModelRow)
            .where(AnalysisModelRow.owner_user_id == owner_user_id)
            .order_by(AnalysisModelRow.analyzed_at.desc())
            .limit(HISTORY_LIMIT)
        )
        return [_analysis(m) for m in rows]

    async def get_for_owner(self, owner_user_id: UUID, analysis_id: UUID) -> Analysis | None:
        model = await self._db.scalar(
            select(AnalysisModelRow).where(
                AnalysisModelRow.owner_user_id == owner_user_id,
                AnalysisModelRow.id == analysis_id,
            )
        )
        return _analysis(model) if model else None


class SqlPromptRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def add(self, prompt: AnalysisPrompt) -> None:
        self._db.add(
            AnalysisPromptModel(
                id=prompt.id,
                company_id=prompt.company_id,
                owner_user_id=prompt.owner_user_id,
                title=prompt.title,
                body=prompt.body,
            )
        )
        await self._db.flush()

    async def list_by_owner(self, owner_user_id: UUID) -> Sequence[AnalysisPrompt]:
        rows = await self._db.scalars(
            select(AnalysisPromptModel)
            .where(AnalysisPromptModel.owner_user_id == owner_user_id)
            .order_by(AnalysisPromptModel.title)
        )
        return [_prompt(m) for m in rows]

    async def get_for_owner(self, owner_user_id: UUID, prompt_id: UUID) -> AnalysisPrompt | None:
        model = await self._db.scalar(
            select(AnalysisPromptModel).where(
                AnalysisPromptModel.owner_user_id == owner_user_id,
                AnalysisPromptModel.id == prompt_id,
            )
        )
        return _prompt(model) if model else None

    async def delete(self, prompt_id: UUID) -> None:
        await self._db.execute(
            delete(AnalysisPromptModel).where(AnalysisPromptModel.id == prompt_id)
        )


class SqlSettingsRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_ai_settings(self, user_id: UUID) -> UserAiSettings | None:
        model = await self._db.get(UserAiSettingsModel, user_id)
        if model is None:
            return None
        return UserAiSettings(user_id, model.model, model.temperature, model.extra_prompt)

    async def save_ai_settings(self, settings: UserAiSettings) -> None:
        values = {
            "model": settings.model,
            "temperature": settings.temperature,
            "extra_prompt": settings.extra_prompt,
        }
        statement = insert(UserAiSettingsModel).values(user_id=settings.user_id, **values)
        await self._db.execute(
            statement.on_conflict_do_update(index_elements=["user_id"], set_=values)
        )

    async def get_retention_days(self, company_id: UUID) -> int | None:
        model = await self._db.get(CompanySettingsModel, company_id)
        return model.retention_days if model else None

    async def save_retention_days(self, company_id: UUID, days: int) -> None:
        statement = insert(CompanySettingsModel).values(company_id=company_id, retention_days=days)
        await self._db.execute(
            statement.on_conflict_do_update(
                index_elements=["company_id"], set_={"retention_days": days}
            )
        )
