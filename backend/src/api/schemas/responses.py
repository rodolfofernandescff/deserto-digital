"""Schemas de resposta da API — todos os modelos de output dos endpoints.

Um único arquivo porque os modelos são pequenos e estreitamente relacionados:
MunicipioDetalhe herda de MunicipioResumo e EstadoResumo referencia MunicipioResumo.
"""

from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class MunicipioResumo(BaseModel):
    """Versão compacta do município — usada em listas, ranking e como campo aninhado."""

    model_config = ConfigDict(populate_by_name=True)

    codigo_ibge: str
    nome: str
    uf: str
    regiao: str
    populacao: int
    idd_score: float | None
    nivel_deserto: str | None
    densidade_banda_larga: float
    percentual_sem_internet: float


class MunicipioDetalhe(MunicipioResumo):
    """Versão completa do município — retornada em GET /municipios/{codigo_ibge}."""

    domicilios_total: int
    domicilios_sem_internet: int
    renda_per_capita: float
    acessos_banda_larga: int
    tem_backhaul: bool
    componentes_idd: dict | None
    fonte_anatel_mes: str | None
    atualizado_em: str


class PaginatedResponse(BaseModel, Generic[T]):
    """Envelope genérico de paginação — usado por GET /municipios."""

    items: list[T]
    total: int
    page: int
    page_size: int
    has_next: bool


class EstadoResumo(BaseModel):
    """Estatísticas agregadas por UF retornadas em GET /estados/{uf}."""

    uf: str
    total_municipios: int
    distribuicao_niveis: dict[str, int]
    populacao_total: int
    idd_medio: float
    pior_municipio: MunicipioResumo
    melhor_municipio: MunicipioResumo


class StatsGerais(BaseModel):
    """Estatísticas globais do dataset retornadas em GET /admin/stats."""

    total_municipios: int
    distribuicao_niveis: dict[str, int]
    percentual_desertos: float
    municipios_sem_backhaul: int
    mes_referencia: str | None = None
    carregado_em: str | None = None


class ErrorResponse(BaseModel):
    """Envelope de erro retornado em todas as respostas 4xx e 5xx."""

    error: str
    detail: str | None = None
    status_code: int
