"""Métricas agregadas por UF para visualização no mapa e painéis."""

from __future__ import annotations

from src.domain.entities.municipio import Municipio

_NIVEIS_SEVERIDADE = ("CRITICO", "VULNERAVEL", "EMERGENTE", "CONECTADO")
_LIMIAR_NIVEL_MAPA = 0.08  # 8% dos municípios já destacam a UF no mapa


def calcular_resumo_estado(municipios: list[Municipio]) -> dict:
    """Calcula indicadores agregados de uma UF para API e mapa."""
    if not municipios:
        return {}

    scored = [m for m in municipios if m.idd_score is not None]
    distribuicao: dict[str, int] = {}
    for m in municipios:
        if m.nivel_deserto:
            distribuicao[m.nivel_deserto] = distribuicao.get(m.nivel_deserto, 0) + 1

    total = len(municipios)
    idd_medio = sum(m.idd_score for m in scored) / len(scored) if scored else 0.0
    densidade_media = sum(m.densidade_banda_larga for m in municipios) / total
    pct_sem_internet_medio = sum(m.percentual_sem_internet for m in municipios) / total

    vulneraveis = distribuicao.get("CRITICO", 0) + distribuicao.get("VULNERAVEL", 0)
    emergentes = distribuicao.get("EMERGENTE", 0)

    return {
        "uf": municipios[0].uf,
        "total_municipios": total,
        "idd_medio": round(idd_medio, 2),
        "densidade_media": round(densidade_media, 2),
        "pct_sem_internet_medio": round(pct_sem_internet_medio, 2),
        "pct_vulneravel": round(vulneraveis / total * 100, 2),
        "pct_emergente": round(emergentes / total * 100, 2),
        "nivel_predominante": _nivel_predominante_mapa(distribuicao, idd_medio),
        "distribuicao_niveis": distribuicao,
    }


def _nivel_predominante_mapa(distribuicao: dict[str, int], idd_medio: float) -> str:
    """Escolhe o nível exibido no mapa priorizando vulnerabilidade regional."""
    total = sum(distribuicao.values()) or 1
    vulneraveis = distribuicao.get("CRITICO", 0) + distribuicao.get("VULNERAVEL", 0)

    if vulneraveis / total >= _LIMIAR_NIVEL_MAPA:
        if distribuicao.get("CRITICO", 0) / total >= 0.03:
            return "CRITICO"
        return "VULNERAVEL"

    for nivel in ("CRITICO", "VULNERAVEL", "EMERGENTE"):
        if distribuicao.get(nivel, 0) / total >= _LIMIAR_NIVEL_MAPA:
            return nivel

    if idd_medio >= 60:
        return "CRITICO"
    if idd_medio >= 40:
        return "VULNERAVEL"
    if idd_medio >= 18:
        return "EMERGENTE"
    return "CONECTADO"
