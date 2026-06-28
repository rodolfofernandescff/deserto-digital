"""Dependências FastAPI injetáveis via Depends().

Centraliza o acesso ao InMemoryStore e às configurações da aplicação,
permitindo substituição via app.dependency_overrides em testes de integração.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from fastapi import HTTPException, status
from pydantic_settings import BaseSettings, SettingsConfigDict

from src.store.memory_store import InMemoryStore

logger = logging.getLogger(__name__)

# Instância global do store — criada uma vez na inicialização, nunca recriada.
# Os endpoints sempre obtêm a referência via get_store() para que os testes
# possam substituí-la com dependency_overrides sem alterar este módulo.
_store: InMemoryStore = InMemoryStore()


class Settings(BaseSettings):
    """Configurações lidas do ambiente (arquivo .env ou variáveis de sistema).

    Todos os campos têm valores padrão para que a API suba mesmo sem .env
    (útil em testes e na primeira execução local).
    """

    anatel_csv_url: str = "https://dados.anatel.gov.br/dados/acesso_movel.csv"
    ibge_api_base: str = "https://servicodados.ibge.gov.br"
    app_env: str = "development"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:3000"
    admin_token: str = "dev-token"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Retorna a instância singleton de Settings.

    lru_cache garante que .env seja lido apenas uma vez.
    Em testes: app.dependency_overrides[get_settings] = lambda: Settings(...)
    """
    return Settings()


def get_store() -> InMemoryStore:
    """Retorna a instância singleton do InMemoryStore.

    Raises:
        HTTPException 503: Se o store ainda não foi carregado (ETL não executado).
    """
    if not _store.is_loaded():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dados não disponíveis. Execute 'make etl' para carregar o dataset.",
        )
    return _store


def get_store_any() -> InMemoryStore:
    """Retorna o store sem verificar se está carregado.

    Usado pelo /health para reportar store_loaded sem lançar 503.
    Pode ser substituído via dependency_overrides em testes.
    """
    return _store


def init_store(data_path: str) -> None:
    """Carrega o JSON do ETL no store global.

    Chamada pelo lifespan da aplicação no startup. Não falha em caso de
    FileNotFoundError — a API sobe e retorna 503 em endpoints de dados.

    Args:
        data_path: Caminho absoluto para backend/data/municipios.json.
    """
    _store.load_from_file(data_path)
    logger.info("Store inicializado com %d municípios", _store.total)
