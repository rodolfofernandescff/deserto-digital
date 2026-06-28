"""Factory da aplicação FastAPI.

Centraliza criação do app, registro de routers, middlewares de CORS, logging
e segurança, e hook de lifespan que carrega os dados em memória no startup.

Rate limiting: implementado via middleware em memória (120 req/min por IP).
Para produção com múltiplas réplicas, substituir pelo slowapi + Redis.
"""

from __future__ import annotations

import logging
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

_DATA_PATH = (
    Path(os.getenv("DATA_PATH", "/app/data/municipios.json"))
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


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Carrega o store no startup; libera no shutdown (sem recursos a fechar)."""
    try:
        init_store(str(_DATA_PATH))
    except FileNotFoundError:
        logger.warning(
            "Dados não encontrados em %s. Execute: make etl", _DATA_PATH
        )
    except Exception as exc:
        logger.error("Erro ao carregar dados no startup: %s", exc)

    yield  # aplicação rodando

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

