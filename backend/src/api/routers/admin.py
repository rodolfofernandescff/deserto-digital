"""Roteador de administração — requer autenticação por token Bearer.

Endpoints:
    POST /admin/refresh — dispara ETL em background e recarrega o store
    GET  /admin/stats   — estatísticas globais do dataset em memória
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, status

from src.api.dependencies import Settings, get_settings, get_store
from src.api.schemas.responses import StatsGerais
from src.store.memory_store import InMemoryStore

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


def _executar_etl(store: InMemoryStore) -> None:
    """Executa o ETL pipeline completo e recarrega o store.

    Roda em thread separada via BackgroundTasks para não bloquear a resposta.
    Falhas são logadas mas não propagadas (o store mantém dados antigos).
    """
    from src.etl.pipeline import ETLPipeline

    try:
        pipeline = ETLPipeline()
        resultado = pipeline.run()
        if resultado.sucesso:
            store.load_from_file(str(pipeline.output_path))
            logger.info(
                "ETL concluído via /admin/refresh: %d municípios recarregados",
                store.total,
            )
        else:
            logger.error("ETL falhou via /admin/refresh: %s", resultado.erros[:5])
    except Exception:
        logger.exception("Erro inesperado no ETL em background")


@router.post(
    "/refresh",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Disparar re-execução do ETL",
)
async def refresh(
    background_tasks: BackgroundTasks,
    authorization: str | None = Header(None, alias="authorization"),
    store: InMemoryStore = Depends(get_store),
    settings: Settings = Depends(get_settings),
) -> dict:
    """Re-executa o pipeline ETL em background e atualiza os dados em memória.

    O endpoint retorna 202 imediatamente. A atualização do store ocorre após
    a conclusão do ETL (~30s). Enquanto o ETL roda, os endpoints continuam
    servindo os dados da carga anterior.

    Raises:
        HTTPException 401: Se o header Authorization estiver ausente ou inválido.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Header 'Authorization: Bearer <token>' requerido.",
        )

    token = authorization.split(" ", 1)[1].strip()
    if token != settings.admin_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido.",
        )

    background_tasks.add_task(_executar_etl, store)
    logger.info("ETL agendado via /admin/refresh")

    return {"message": "Pipeline iniciado", "status": "running"}


@router.get(
    "/stats",
    response_model=StatsGerais,
    summary="Estatísticas globais do dataset",
)
async def stats(
    store: InMemoryStore = Depends(get_store),
) -> StatsGerais:
    """Retorna estatísticas pré-computadas sobre o dataset completo em memória."""
    dados = store.get_stats()
    return StatsGerais.model_validate(dados)
