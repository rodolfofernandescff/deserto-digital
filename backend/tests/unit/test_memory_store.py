"""Testes unitários do InMemoryStore.

Cobre carregamento via arquivo, lookup por código, ranking, busca textual,
estatísticas e recarga de dados com swap atômico.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from src.store.memory_store import InMemoryStore

_FIXTURE = Path(__file__).parent.parent / "fixtures" / "municipios_test.json"


@pytest.fixture
def store_loaded() -> InMemoryStore:
    s = InMemoryStore()
    s.load_from_file(str(_FIXTURE))
    return s


def test_load_from_file(store_loaded: InMemoryStore) -> None:
    """Deve carregar 5 municípios do JSON e marcar o store como inicializado."""
    assert store_loaded.is_loaded()
    assert store_loaded.total == 5
    sp = store_loaded.get_by_codigo("3550308")
    assert sp is not None
    assert sp.nome == "São Paulo"
    assert sp.uf == "SP"
    assert sp.nivel_deserto == "CONECTADO"


def test_get_by_codigo_existente(store_loaded: InMemoryStore) -> None:
    """Lookup por código IBGE deve retornar o município correto."""
    itamarati = store_loaded.get_by_codigo("1301803")
    assert itamarati is not None
    assert itamarati.nome == "Itamarati"
    assert itamarati.nivel_deserto == "CRITICO"

    manaus = store_loaded.get_by_codigo("1302603")
    assert manaus is not None
    assert manaus.nome == "Manaus"


def test_get_by_codigo_inexistente(store_loaded: InMemoryStore) -> None:
    """Código IBGE inexistente deve retornar None sem lançar exceção."""
    assert store_loaded.get_by_codigo("9999999") is None
    assert store_loaded.get_by_codigo("0000000") is None


def test_ranking_ordenado_desc(store_loaded: InMemoryStore) -> None:
    """Ranking deve retornar municípios em ordem decrescente de idd_score."""
    ranking = store_loaded.get_ranking(limit=10)
    assert len(ranking) == 5

    scores = [m.idd_score for m in ranking]
    assert scores == sorted(scores, reverse=True), "Ranking deve ser idd_score DESC"

    # Itamarati (score≈84.28) é o mais crítico → primeiro
    assert ranking[0].codigo_ibge == "1301803"
    # São Paulo (score≈9.76) é o mais conectado → último
    assert ranking[-1].codigo_ibge == "3550308"


def test_search_by_nome_case_insensitive(store_loaded: InMemoryStore) -> None:
    """Busca deve funcionar sem diferenciação de acentos e maiúsculas/minúsculas."""
    # Busca com caixa alta + sem acento → deve encontrar São Paulo
    resultado = store_loaded.search_by_nome("SAO PAULO")
    assert len(resultado) == 1
    assert resultado[0].codigo_ibge == "3550308"

    # Busca minúscula sem acento → deve encontrar Santarém
    resultado = store_loaded.search_by_nome("santarem")
    assert len(resultado) == 1
    assert resultado[0].codigo_ibge == "1506807"

    # Busca por substring compartilhada entre Manaus e Itamarati (ambas AM)
    resultado = store_loaded.search_by_nome("a")
    assert len(resultado) > 1

    # Substring inexistente retorna lista vazia
    assert store_loaded.search_by_nome("ZZZNAOEXISTE") == []


def test_stats_calcula_corretamente(store_loaded: InMemoryStore) -> None:
    """Estatísticas globais devem refletir corretamente o dataset de 5 municípios."""
    stats = store_loaded.get_stats()

    assert stats["total_municipios"] == 5

    dist = stats["distribuicao_niveis"]
    assert dist.get("CONECTADO") == 2    # São Paulo, Porto Alegre
    assert dist.get("EMERGENTE") == 1    # Manaus
    assert dist.get("VULNERAVEL") == 1   # Santarém
    assert dist.get("CRITICO") == 1      # Itamarati

    # 2 desertos (CRITICO + VULNERAVEL) em 5 → 40%
    assert stats["percentual_desertos"] == 40.0

    # Apenas Itamarati não tem backhaul
    assert stats["municipios_sem_backhaul"] == 1

    # Há estimativa de população sem internet (> 0)
    assert stats["populacao_sem_internet"] > 0


def test_reload_limpa_dados_anteriores(
    store_loaded: InMemoryStore, tmp_path: Path
) -> None:
    """Após reload, dados antigos devem ser substituídos pelos novos."""
    # Confirma que Itamarati existe antes do reload
    assert store_loaded.get_by_codigo("1301803") is not None

    # Cria um JSON temporário com apenas um município diferente
    novo_municipio = {
        "codigo_ibge": "4106902",
        "nome": "Curitiba",
        "uf": "PR",
        "regiao": "Sul",
        "populacao": 1948626,
        "domicilios_total": 750000,
        "domicilios_sem_internet": 75000,
        "renda_per_capita": 2200.0,
        "acessos_banda_larga": 700000,
        "tem_backhaul": True,
        "atualizado_em": "2024-10-15T12:00:00+00:00",
        "idd_score": 8.5,
        "nivel_deserto": "CONECTADO",
        "componentes_idd": {"infraestrutura": 3.33, "exclusao": 3.0, "renda": 2.17, "backhaul": 0.0},
        "fonte_anatel_mes": "2024-10",
    }
    novo_json = {
        "gerado_em": "2024-11-01T00:00:00+00:00",
        "total": 1,
        "mes_referencia": "2024-11",
        "municipios": [novo_municipio],
    }
    arquivo_tmp = tmp_path / "municipios_novo.json"
    arquivo_tmp.write_text(json.dumps(novo_json), encoding="utf-8")

    store_loaded.reload(str(arquivo_tmp))

    # Dados antigos não devem existir
    assert store_loaded.get_by_codigo("1301803") is None  # Itamarati
    assert store_loaded.get_by_codigo("3550308") is None  # São Paulo

    # Novo dado deve existir
    assert store_loaded.total == 1
    curitiba = store_loaded.get_by_codigo("4106902")
    assert curitiba is not None
    assert curitiba.nome == "Curitiba"
