"""Roteador de municípios.

Endpoints:
    GET /municipios          — lista paginada com filtros opcionais
    GET /municipios/search   — busca por nome (substring, sem acentos)
    GET /municipios/{codigo} — detalhe completo por código IBGE de 7 dígitos

IMPORTANTE: /search deve ser declarado antes de /{codigo_ibge} para que
"search" não seja interpretado como um código IBGE pela roteador do Starlette.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status

from src.api.dependencies import get_store
from src.api.schemas.responses import (
    ErrorResponse,
    MunicipioDetalhe,
    MunicipioResumo,
    PaginatedResponse,
)
from src.domain.entities.municipio import Municipio
from src.store.memory_store import InMemoryStore

router = APIRouter(prefix="/municipios", tags=["municipios"])

_NIVEL_VALIDOS = {"CRITICO", "VULNERAVEL", "EMERGENTE", "CONECTADO"}


def _to_resumo(m: Municipio) -> MunicipioResumo:
    return MunicipioResumo.model_validate(m.model_dump(mode="json"))


def _to_detalhe(m: Municipio) -> MunicipioDetalhe:
    return MunicipioDetalhe.model_validate(m.model_dump(mode="json"))


@router.get(
    "",
    response_model=PaginatedResponse[MunicipioResumo],
    summary="Listar municípios",
    openapi_extra={
        "x-example": {"uf": "AM", "nivel": "CRITICO", "page": 1, "page_size": 20}
    },
)
async def listar_municipios(
    uf: str | None = Query(
        None,
        min_length=2,
        max_length=2,
        description="Filtrar por sigla da UF (ex.: AM)",
    ),
    nivel: str | None = Query(
        None,
        description="Filtrar por nível: CRITICO | VULNERAVEL | EMERGENTE | CONECTADO",
    ),
    page: int = Query(1, ge=1, description="Página (começa em 1)"),
    page_size: int = Query(20, ge=1, le=100, description="Itens por página"),
    store: InMemoryStore = Depends(get_store),
) -> PaginatedResponse[MunicipioResumo]:
    """Lista municípios com paginação e filtros opcionais por UF e nível IDD."""
    if nivel and nivel not in _NIVEL_VALIDOS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Nível inválido: {nivel!r}. Válidos: {sorted(_NIVEL_VALIDOS)}",
        )

    if uf:
        base = store.list_by_uf(uf.upper(), nivel)
        total = len(base)
        offset = (page - 1) * page_size
        itens = base[offset : offset + page_size]
    elif nivel:
        base = store.list_by_nivel(nivel)
        total = len(base)
        offset = (page - 1) * page_size
        itens = base[offset : offset + page_size]
    else:
        # Usa o ranking pré-computado com paginação nativa (O(1) para qualquer página)
        offset = (page - 1) * page_size
        itens = store.get_ranking(limit=page_size, offset=offset)
        total = store.total

    return PaginatedResponse[MunicipioResumo](
        items=[_to_resumo(m) for m in itens],
        total=total,
        page=page,
        page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.get(
    "/search",
    response_model=list[MunicipioResumo],
    summary="Buscar municípios por nome",
)
async def buscar_municipios(
    q: str = Query(..., min_length=2, description="Texto a buscar no nome do município"),
    limit: int = Query(10, ge=1, le=20, description="Número máximo de resultados"),
    store: InMemoryStore = Depends(get_store),
) -> list[MunicipioResumo]:
    """Busca municípios por substring no nome, sem diferenciação de acentos ou maiúsculas."""
    resultados = store.search_by_nome(q, limit=limit)
    return [_to_resumo(m) for m in resultados]


@router.get(
    "/{codigo_ibge}",
    response_model=MunicipioDetalhe,
    responses={
        404: {"model": ErrorResponse, "description": "Município não encontrado"},
    },
    summary="Detalhe do município",
)
async def detalhe_municipio(
    codigo_ibge: str = Path(
        pattern=r"^\d{7}$",
        description="Código IBGE de 7 dígitos numéricos",
    ),
    store: InMemoryStore = Depends(get_store),
) -> MunicipioDetalhe:
    """Retorna os dados completos de um município pelo código IBGE de 7 dígitos."""
    municipio = store.get_by_codigo(codigo_ibge)
    if municipio is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Município com código IBGE '{codigo_ibge}' não encontrado.",
        )
    return _to_detalhe(municipio)
