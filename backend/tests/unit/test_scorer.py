"""Testes unitários do IDDScorer."""

from __future__ import annotations

import pytest

from src.domain.entities.municipio import Municipio
from src.domain.services.scorer import IDDScorer

_ATUALIZADO_EM = "2024-10-01T00:00:00"


def _municipio(**kwargs) -> Municipio:
    """Factory com defaults válidos — sobrescreva apenas o que o teste precisa."""
    defaults: dict = {
        "codigo_ibge": "3550308",
        "nome": "Município Teste",
        "uf": "SP",
        "regiao": "Sudeste",
        "populacao": 10_000,
        "domicilios_total": 100,
        "domicilios_sem_internet": 10,
        "renda_per_capita": 2_000.0,
        "acessos_banda_larga": 50,
        "tem_backhaul": True,
        "atualizado_em": _ATUALIZADO_EM,
    }
    defaults.update(kwargs)
    return Municipio(**defaults)


def test_municipio_critico():
    """densidade=0, sem_internet=80%, renda=500 → score >= 70 → nivel CRITICO."""
    scorer = IDDScorer()
    m = _municipio(
        acessos_banda_larga=0,
        domicilios_total=100,
        domicilios_sem_internet=80,
        renda_per_capita=500.0,
        tem_backhaul=False,
    )
    resultado = scorer.calculate(m)

    # Verificação analítica (não depende de constantes internas):
    # comp_infra  = (1 - 0/100) * 100 * 0.40 = 40.0
    # comp_exclusao = 80 * 0.30             = 24.0
    # comp_renda  ≈ (1 - ln(500)/ln(10000)) * 100 * 0.20  ≈ 6.5
    # comp_backhaul = 100 * 0.10            = 10.0
    # score ≈ 80.5 → CRITICO
    assert resultado.nivel == "CRITICO"
    assert resultado.score >= 70.0


def test_municipio_conectado():
    """densidade=80, sem_internet=5%, renda=5000 → score < 20 → nivel CONECTADO."""
    scorer = IDDScorer()
    m = _municipio(
        acessos_banda_larga=80,
        domicilios_total=100,
        domicilios_sem_internet=5,
        renda_per_capita=5_000.0,
        tem_backhaul=True,
    )
    resultado = scorer.calculate(m)

    # comp_infra  = (1 - 80/100) * 100 * 0.40  = 8.0
    # comp_exclusao = 5 * 0.30                 = 1.5
    # comp_renda  ≈ (1 - ln(5000)/ln(10000)) * 100 * 0.20 ≈ 1.5
    # comp_backhaul = 0
    # score ≈ 11.0 → CONECTADO
    assert resultado.nivel == "CONECTADO"
    assert resultado.score < 20.0


def test_sem_backhaul_adiciona_componente():
    """Trocar tem_backhaul=True→False deve elevar o score em exatamente peso_backhaul*100."""
    scorer = IDDScorer()
    base = dict(
        acessos_banda_larga=50,
        domicilios_total=100,
        domicilios_sem_internet=20,
        renda_per_capita=2_000.0,
    )
    score_com = scorer.calculate(_municipio(**base, tem_backhaul=True)).score
    score_sem = scorer.calculate(_municipio(**base, tem_backhaul=False)).score

    assert score_sem - score_com == pytest.approx(scorer.peso_backhaul * 100.0, abs=1e-9)


def test_confianca_reduzida_sem_populacao():
    """populacao=0 deve reduzir a confiança em 0.4 resultando em confiança == 0.6."""
    scorer = IDDScorer()
    # acessos > 0 e tem_backhaul=True evita reduções adicionais de confiança
    m = _municipio(populacao=0, acessos_banda_larga=10, tem_backhaul=True)
    resultado = scorer.calculate(m)

    assert resultado.confianca < 0.7
    assert resultado.confianca == pytest.approx(0.6)


def test_score_clampado():
    """Nenhum score pode sair do intervalo [0.0, 100.0], mesmo com pesos que somam > 1."""
    scorer_padrao = IDDScorer()
    # Pesos intencionalmente maiores que 1.0 no total (1.6) para forçar score > 100 sem clamp
    scorer_exagerado = IDDScorer(
        peso_infraestrutura=0.60,
        peso_exclusao=0.50,
        peso_renda=0.30,
        peso_backhaul=0.20,
    )

    municipios = [
        # Pior cenário possível
        _municipio(acessos_banda_larga=0, domicilios_sem_internet=100, renda_per_capita=1.0, tem_backhaul=False),
        # Melhor cenário possível
        _municipio(acessos_banda_larga=100, domicilios_sem_internet=0, renda_per_capita=10_000.0, tem_backhaul=True),
        # Caso intermediário
        _municipio(acessos_banda_larga=40, domicilios_sem_internet=50, renda_per_capita=1_500.0, tem_backhaul=False),
    ]

    for m in municipios:
        for scorer in (scorer_padrao, scorer_exagerado):
            r = scorer.calculate(m)
            assert 0.0 <= r.score <= 100.0, (
                f"Score {r.score} fora de [0, 100] para município '{m.nome}'"
            )


def test_pesos_somam_1():
    """A soma dos quatro pesos padrão deve ser exatamente 1.0."""
    scorer = IDDScorer()
    total = (
        scorer.peso_infraestrutura
        + scorer.peso_exclusao
        + scorer.peso_renda
        + scorer.peso_backhaul
    )
    assert total == pytest.approx(1.0)
