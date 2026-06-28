"""Roteador de estados.

Endpoints:
    GET /estados       — lista todas as UFs com contagem e IDD médio
    GET /estados/{uf}  — estatísticas detalhadas da UF
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from src.api.dependencies import get_store
from src.api.schemas.responses import EstadoResumo, MunicipioResumo
from src.domain.entities.municipio import Municipio
from src.domain.services.estado_metrics import calcular_resumo_estado
from src.store.memory_store import InMemoryStore

router = APIRouter(prefix="/estados", tags=["estados"])


def _to_resumo(m: Municipio) -> MunicipioResumo:
    return MunicipioResumo.model_validate(m.model_dump(mode="json"))


@router.get(
    "",
    response_model=list[dict],
    summary="Listar UFs com indicadores",
)
async def listar_estados(
    store: InMemoryStore = Depends(get_store),
) -> list[dict]:
    """Retorna todas as UFs com métricas agregadas para o mapa interativo."""
    all_muns = store.get_ranking(limit=10_000)
    ufs = sorted({m.uf for m in all_muns})

    resultado = []
    for uf in ufs:
        municipios = store.list_by_uf(uf)
        resumo = calcular_resumo_estado(municipios)
        resultado.append(resumo)

    return resultado


@router.get(
    "/{uf}",
    response_model=EstadoResumo,
    summary="Resumo de conectividade por UF",
)
async def detalhe_estado(
    uf: str,
    store: InMemoryStore = Depends(get_store),
) -> EstadoResumo:
    """Estatísticas agregadas de conectividade para todos os municípios da UF.

    Raises:
        HTTPException 404: Se a UF não existir no dataset.
    """
    resumo = store.get_resumo_uf(uf.upper())
    if resumo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"UF '{uf.upper()}' não encontrada no dataset.",
        )

    return EstadoResumo(
        uf=resumo["uf"],
        total_municipios=resumo["total_municipios"],
        distribuicao_niveis=resumo["distribuicao_niveis"],
        populacao_total=resumo["populacao_total"],
        idd_medio=resumo["idd_medio"],
        pior_municipio=_to_resumo(resumo["pior_municipio"]),
        melhor_municipio=_to_resumo(resumo["melhor_municipio"]),
    )
