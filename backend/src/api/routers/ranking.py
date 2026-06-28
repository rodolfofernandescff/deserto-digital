"""Roteador de ranking.

Endpoints:
    GET /ranking — municípios ordenados do mais desconectado para o mais conectado
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from src.api.dependencies import get_store
from src.api.schemas.responses import MunicipioResumo
from src.domain.entities.municipio import Municipio
from src.store.memory_store import InMemoryStore

router = APIRouter(prefix="/ranking", tags=["ranking"])


def _to_resumo(m: Municipio) -> MunicipioResumo:
    return MunicipioResumo.model_validate(m.model_dump(mode="json"))


@router.get(
    "",
    response_model=list[MunicipioResumo],
    summary="Ranking de desertos digitais",
)
async def ranking(
    limit: int = Query(
        50,
        ge=1,
        le=200,
        description="Número máximo de resultados",
    ),
    uf: str | None = Query(
        None,
        min_length=2,
        max_length=2,
        description="Restringir ranking à UF (ex.: MG)",
    ),
    nivel: str | None = Query(
        None,
        description="Filtrar por nível: CRITICO | VULNERAVEL | EMERGENTE | CONECTADO",
    ),
    store: InMemoryStore = Depends(get_store),
) -> list[MunicipioResumo]:
    """Municípios ordenados do mais desconectado (maior IDD) para o mais conectado.

    Combina filtros por UF e nível livremente. Municípios sem score
    aparecem ao final da lista.
    """
    municipios = store.get_ranking(limit=limit, uf=uf, nivel=nivel)
    return [_to_resumo(m) for m in municipios]
