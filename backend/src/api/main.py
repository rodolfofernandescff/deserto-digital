"""Factory da aplicação FastAPI.

Centraliza criação do app, registro de routers, middlewares de CORS, logging
e segurança, e hook de lifespan que carrega os dados em memória no startup.

Rate limiting: implementado via middleware em memória (120 req/min por IP).
Para produção com múltiplas réplicas, substituir pelo slowapi + Redis.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from src.api.dependencies import get_settings, get_store_any, init_store
from src.api.routers import admin, estados, municipios, ranking
from src.api.schemas.responses import ErrorResponse
from src.store.memory_store import InMemoryStore

logger = logging.getLogger(__name__)

_DATA_PATH = Path(
    os.getenv("DATA_PATH") or
    str(Path(__file__).resolve().parents[3] / "data" / "municipios.json")
)


# ── Middlewares ───────────────────────────────────────────────────────────────

class LoggingMiddleware(BaseHTTPMiddleware):
    """Loga método, path, status_code e duração de cada requisição."""

    async def dispatch(self, request: Request, call_next):
        start = time.monotonic()
        response = await call_next(request)
        duration_ms = int((time.monotonic() - start) * 1000)
        logger.info(
            "%s %s %s %dms",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adiciona headers de segurança HTTP básicos em todas as respostas."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting em memória: 120 requisições por IP por minuto.

    Baseado em sliding window. Não é thread-safe para alta concorrência,
    mas é suficiente para um servidor single-worker sem Redis.
    """

    def __init__(self, app, calls: int = 120, period: int = 60) -> None:
        super().__init__(app)
        self._calls = calls
        self._period = period
        self._windows: defaultdict[str, deque] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next) -> Response:
        ip = request.client.host if request.client else "unknown"
        now = time.monotonic()
        window = self._windows[ip]

        # Descarta timestamps fora da janela deslizante
        while window and window[0] < now - self._period:
            window.popleft()

        if len(window) >= self._calls:
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit excedido", "detail": "120 req/min por IP", "status_code": 429},
            )

        window.append(now)
        return await call_next(request)


# ── ETL helpers ───────────────────────────────────────────────────────────────

def _executar_etl_sync(data_path: Path) -> bool:
    """Executa o pipeline ETL de forma síncrona (para uso em asyncio.to_thread).

    Returns:
        True se o pipeline concluiu com sucesso.
    """
    from src.etl.pipeline import ETLPipeline

    pipeline = ETLPipeline(output_path=str(data_path))
    resultado = pipeline.run()
    if resultado.sucesso:
        logger.info(
            "ETL concluído: %d municípios em %.1fs",
            resultado.total_municipios,
            resultado.duracao_segundos,
        )
    else:
        logger.error("ETL falhou: %s", resultado.erros[:3])
    return resultado.sucesso


async def _periodic_etl(data_path: Path, interval_hours: int = 168) -> None:
    """Reexecuta o ETL periodicamente em background (padrão: semanal).

    Roda o ETL em thread-pool via asyncio.to_thread para não bloquear o
    event loop. Após cada execução bem-sucedida, recarrega o InMemoryStore.
    """
    while True:
        await asyncio.sleep(interval_hours * 3600)
        logger.info("ETL periódico iniciando (intervalo configurado: %dh)...", interval_hours)
        try:
            sucesso = await asyncio.to_thread(_executar_etl_sync, data_path)
            if sucesso:
                init_store(str(data_path))
                store = get_store_any()
                logger.info("ETL periódico: store recarregado com %d municípios", store.total)
        except Exception:
            logger.exception("Erro inesperado no ETL periódico")


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: carrega dados (executando ETL se necessário). Registra ETL semanal."""

    # Se o arquivo de dados não existe, executar ETL agora para que a API
    # suba com dados válidos. O ETL roda em thread para não bloquear o loop.
    if not _DATA_PATH.exists():
        logger.warning(
            "municipios.json não encontrado em %s — executando ETL no startup...",
            _DATA_PATH,
        )
        try:
            await asyncio.to_thread(_executar_etl_sync, _DATA_PATH)
        except Exception as exc:
            logger.error("ETL no startup falhou inesperadamente: %s", exc)

    # Carregar (ou recarregar) o store a partir do JSON gerado pelo ETL
    try:
        init_store(str(_DATA_PATH))
    except FileNotFoundError:
        logger.warning(
            "Dados não encontrados em %s após tentativa de ETL. "
            "A API responderá 503 em endpoints de dados até que o ETL seja executado.",
            _DATA_PATH,
        )
    except Exception as exc:
        logger.error("Erro ao carregar dados no startup: %s", exc)

    # Registrar tarefa de ETL periódico semanal em background
    etl_task = asyncio.create_task(
        _periodic_etl(_DATA_PATH, interval_hours=168),
        name="etl-semanal",
    )
    logger.info("ETL periódico semanal registrado (próxima execução em 168h)")

    yield  # aplicação rodando

    etl_task.cancel()
    try:
        await etl_task
    except asyncio.CancelledError:
        pass
    logger.info("API encerrando")


# ── Factory ───────────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    """Cria e configura a instância FastAPI pronta para ser servida pelo uvicorn."""
    settings = get_settings()
    is_dev = settings.app_env != "production"

    app = FastAPI(
        title="Deserto Digital API",
        version="1.0.0",
        description="API REST de conectividade digital por município brasileiro.",
        docs_url="/docs" if is_dev else None,
        redoc_url="/redoc" if is_dev else None,
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    cors_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Middlewares (ordem: último adicionado = primeiro executado) ────────────
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(RateLimitMiddleware, calls=120, period=60)

    # ── Exception handlers ────────────────────────────────────────────────────
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error=_status_label(exc.status_code),
                detail=str(exc.detail) if exc.detail else None,
                status_code=exc.status_code,
            ).model_dump(),
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.exception("Erro interno não tratado: %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error="internal_server_error",
                detail="Ocorreu um erro interno. Tente novamente em instantes.",
                status_code=500,
            ).model_dump(),
        )

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(municipios.router)
    app.include_router(ranking.router)
    app.include_router(estados.router)
    app.include_router(admin.router)

    # ── Health ────────────────────────────────────────────────────────────────
    @app.get("/health", tags=["infra"], summary="Health check")
    async def health(store: InMemoryStore = Depends(get_store_any)):
        return {"status": "ok", "store_loaded": store.is_loaded(), "version": "1.0.0"}

    return app


def _status_label(code: int) -> str:
    _LABELS = {
        400: "bad_request", 401: "unauthorized", 403: "forbidden",
        404: "not_found", 422: "unprocessable_entity",
        429: "too_many_requests", 503: "service_unavailable",
    }
    return _LABELS.get(code, "http_error")


app = create_app()

