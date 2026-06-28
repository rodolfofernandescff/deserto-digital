"""Testes unitários do IDDScorer."""

from __future__ import annotations

import math

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
    """Sem ANATEL, exclusao=80%, renda=500 → score ≈ 61 → nivel CRITICO (>= 55)."""
    scorer = IDDScorer()
    m = _municipio(
        acessos_banda_larga=0,
        domicilios_total=100,
        domicilios_sem_internet=80,
        renda_per_capita=500.0,
        tem_backhaul=False,
    )
    resultado = scorer.calculate(m)

    # Sem ANATEL: peso_exclusao=0.60, peso_renda=0.40
    # comp_exclusao = 80 * 0.60 = 48.0
    # comp_renda = (1 - ln(500)/ln(10000)) * 100 * 0.40 ≈ 13.0
    # score ≈ 61.0 → CRITICO (>= 55)
    assert resultado.nivel == "CRITICO"
    assert resultado.score >= 55.0


def test_municipio_conectado():
    """Com ANATEL, densidade=80, sem_internet=5%, renda=5000 → score < 15 → CONECTADO."""
    scorer = IDDScorer()
    m = _municipio(
        acessos_banda_larga=80,
        domicilios_total=100,
        domicilios_sem_internet=5,
        renda_per_capita=5_000.0,
        tem_backhaul=True,
    )
    resultado = scorer.calculate(m)

    # comp_infra  = (1 - 80/100) * 100 * 0.40 = 8.0
    # comp_exclusao = 5 * 0.30               = 1.5
    # comp_renda  ≈ (1 - ln(5000)/ln(10000)) * 100 * 0.20 ≈ 1.5
    # comp_backhaul = 0
    # score ≈ 11.0 → CONECTADO (< 15)
    assert resultado.nivel == "CONECTADO"
    assert resultado.score < 20.0


def test_sem_backhaul_adiciona_componente():
    """Com ANATEL, trocar tem_backhaul=True→False eleva score em exatamente peso_backhaul*100."""
    scorer = IDDScorer()
    base = dict(
        acessos_banda_larga=50,
        domicilios_total=100,
        domicilios_sem_internet=20,
        renda_per_capita=2_000.0,
    )
    score_com = scorer.calculate(_municipio(**base, tem_backhaul=True)).score
    score_sem = scorer.calculate(_municipio(**base, tem_backhaul=False)).score

    # acessos_banda_larga=50 > 0 → tem_dados_anatel=True em ambos os casos
    assert score_sem - score_com == pytest.approx(scorer.peso_backhaul * 100.0, abs=1e-9)


def test_confianca_reduzida_sem_populacao():
    """populacao=0 deve reduzir a confiança em 0.4 resultando em confiança == 0.6."""
    scorer = IDDScorer()
    # acessos > 0 evita redução adicional de -0.3 por falta de ANATEL
    m = _municipio(populacao=0, acessos_banda_larga=10, tem_backhaul=True)
    resultado = scorer.calculate(m)

    assert resultado.confianca == pytest.approx(0.6)


def test_score_clampado():
    """Nenhum score pode sair do intervalo [0.0, 100.0], mesmo com pesos que somam > 1."""
    scorer_padrao = IDDScorer()
    scorer_exagerado = IDDScorer(
        peso_infraestrutura=0.60,
        peso_exclusao=0.50,
        peso_renda=0.30,
        peso_backhaul=0.20,
    )

    municipios = [
        _municipio(acessos_banda_larga=0, domicilios_sem_internet=100, renda_per_capita=1.0, tem_backhaul=False),
        _municipio(acessos_banda_larga=100, domicilios_sem_internet=0, renda_per_capita=10_000.0, tem_backhaul=True),
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


def test_sem_anatel_usa_apenas_ibge():
    """Sem dados ANATEL: infra e backhaul são 0, score só de exclusao+renda, confiança=0.7."""
    scorer = IDDScorer()
    m = _municipio(
        acessos_banda_larga=0,
        tem_backhaul=False,
        domicilios_total=100,
        domicilios_sem_internet=40,
        renda_per_capita=1_500.0,
        populacao=10_000,
    )
    resultado = scorer.calculate(m)

    # Componentes de infraestrutura e backhaul devem ser zero
    assert resultado.componentes["infraestrutura"] == pytest.approx(0.0)
    assert resultado.componentes["backhaul"] == pytest.approx(0.0)
    assert resultado.componentes["tem_dados_anatel"] is False

    # Score calculado apenas por exclusao (40*0.60=24) + renda (~8.24) ≈ 32.24
    exclusao_esperada = 40.0 * 0.60
    renda_esperada = (1.0 - math.log(1_500.0) / math.log(10_000.0)) * 100.0 * 0.40
    assert resultado.score == pytest.approx(exclusao_esperada + renda_esperada, abs=0.01)

    # Confiança penalizada em -0.3 por ausência de ANATEL
    assert resultado.confianca == pytest.approx(0.7)


def test_com_anatel_usa_todos_componentes():
    """Com dados ANATEL: todos os 4 componentes contribuem ao score e confiança=1.0."""
    scorer = IDDScorer()
    m = _municipio(
        acessos_banda_larga=20,
        tem_backhaul=False,
        domicilios_total=100,
        domicilios_sem_internet=50,
        renda_per_capita=1_000.0,
        populacao=10_000,
    )
    resultado = scorer.calculate(m)

    assert resultado.componentes["tem_dados_anatel"] is True
    # acessos=20, densidade=20 → infra = (1 - 0.20) * 100 * 0.40 = 32.0
    assert resultado.componentes["infraestrutura"] == pytest.approx(32.0)
    # tem_backhaul=False → backhaul = 100 * 0.10 = 10.0
    assert resultado.componentes["backhaul"] == pytest.approx(10.0)
    # populacao > 0, domicilios > 0, tem_dados_anatel=True → sem penalidades
    assert resultado.confianca == pytest.approx(1.0)
