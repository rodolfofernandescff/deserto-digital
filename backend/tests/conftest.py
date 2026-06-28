"""Fixtures compartilhadas entre todos os módulos de teste.

Contém três grupos de fixtures:
  1. Dados mock (municipios_mock, store, app, client) — usados por testes unitários e de integração
  2. Fixtures de dados reais (app_client) — usa tests/fixtures/municipios_test.json
  3. Entidades de domínio (sample_municipio_critico, sample_municipio_conectado, scorer)
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.domain.entities.municipio import Municipio
from src.domain.services.scorer import IDDScorer
from src.store.memory_store import InMemoryStore

_FIXTURE_PATH = Path(__file__).parent / "fixtures" / "municipios_test.json"

_UF_PARA_REGIAO: dict[str, str] = {
    "AC": "Norte", "AP": "Norte", "AM": "Norte", "PA": "Norte",
    "RO": "Norte", "RR": "Norte", "TO": "Norte",
    "AL": "Nordeste", "BA": "Nordeste", "CE": "Nordeste", "MA": "Nordeste",
    "PB": "Nordeste", "PE": "Nordeste", "PI": "Nordeste", "RN": "Nordeste",
    "SE": "Nordeste",
    "DF": "Centro-Oeste", "GO": "Centro-Oeste", "MT": "Centro-Oeste", "MS": "Centro-Oeste",
    "ES": "Sudeste", "MG": "Sudeste", "RJ": "Sudeste", "SP": "Sudeste",
    "PR": "Sul", "RS": "Sul", "SC": "Sul",
}


def _make_municipio(
    codigo: str,
    nome: str,
    uf: str,
    populacao: int,
    domicilios: int,
    acessos: int,
    score: float,
) -> Municipio:
    """Factory helper para criar municípios de teste com IDDScore preenchido."""
    if score >= 70:
        nivel = "CRITICO"
    elif score >= 45:
        nivel = "VULNERAVEL"
    elif score >= 20:
        nivel = "EMERGENTE"
    else:
        nivel = "CONECTADO"

    uf_upper = uf.upper()
    sem_internet = min(domicilios // 5, domicilios)

    return Municipio(
        codigo_ibge=codigo.zfill(7),
        nome=nome,
        uf=uf_upper,
        regiao=_UF_PARA_REGIAO.get(uf_upper, "Sudeste"),
        populacao=populacao,
        domicilios_total=domicilios,
        domicilios_sem_internet=sem_internet,
        renda_per_capita=1500.0,
        acessos_banda_larga=acessos,
        tem_backhaul=acessos > 0,
        atualizado_em="2024-10-15T12:00:00+00:00",
        idd_score=score,
        nivel_deserto=nivel,
        componentes_idd={
            "infraestrutura": score * 0.40,
            "exclusao": score * 0.30,
            "renda": score * 0.20,
            "backhaul": score * 0.10,
        },
        fonte_anatel_mes="2024-10",
    )


# ── Fixtures de dados mock ─────────────────────────────────────────────────────

@pytest.fixture
def municipios_mock() -> list[Municipio]:
    """Lista com 5 municípios fictícios cobrindo os extremos do espectro de score.

    SP (3 municípios): CONECTADO, EMERGENTE, VULNERAVEL
    RJ (1 município): CRITICO
    AM (1 município): CONECTADO
    """
    return [
        _make_municipio("3510001", "Mun Alpha",   "SP", 50_000,  20_000, 18_000, 5.0),
        _make_municipio("3520001", "Mun Beta",    "SP", 30_000,  12_000,  5_000, 30.0),
        _make_municipio("3530001", "Mun Gamma",   "SP", 80_000,  30_000,  8_000, 55.0),
        _make_municipio("3300001", "Mun Delta",   "RJ", 10_000,   4_000,    500, 75.0),
        _make_municipio("1300001", "Mun Epsilon", "AM", 15_000,   5_000,  4_500, 12.0),
    ]


@pytest.fixture
def store(municipios_mock: list[Municipio]) -> InMemoryStore:
    """InMemoryStore pré-populado com os municípios mock."""
    s = InMemoryStore()
    s.carregar(municipios_mock)
    return s


@pytest.fixture
def app(store: InMemoryStore):
    """Instância da FastAPI com dependências substituídas pelos mocks de teste.

    Sobrescreve get_store() e get_settings() via dependency_overrides para
    que nenhum endpoint acesse arquivos reais ou execute o ETL.
    """
    from src.api.dependencies import Settings, get_settings, get_store, get_store_any
    from src.api.main import create_app

    def _test_settings() -> Settings:
        return Settings(
            admin_token="test-admin-token",
            cors_origins="http://localhost:3000",
            app_env="test",
        )

    application = create_app()
    application.dependency_overrides[get_store] = lambda: store
    application.dependency_overrides[get_store_any] = lambda: store
    application.dependency_overrides[get_settings] = _test_settings
    yield application
    application.dependency_overrides.clear()


@pytest.fixture
def client(app) -> TestClient:
    """TestClient síncrono para testes de integração de endpoints."""
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


# ── Fixture com dados reais do JSON ───────────────────────────────────────────

@pytest.fixture
def app_client() -> TestClient:
    """TestClient carregado com os 5 municípios reais de tests/fixtures/municipios_test.json.

    Antes: carrega InMemoryStore com o arquivo de fixture.
    Depois: limpa o store (dependency_overrides.clear()).

    Use este fixture quando os testes precisam de dados reais com scores
    calculados (IDD, nivel_deserto) em vez dos dados mock sem score.
    """
    from src.api.dependencies import Settings, get_settings, get_store, get_store_any
    from src.api.main import create_app

    s = InMemoryStore()
    s.load_from_file(str(_FIXTURE_PATH))

    def _test_settings() -> Settings:
        return Settings(
            admin_token="test-admin-token",
            cors_origins="http://localhost:3000",
            app_env="test",
        )

    application = create_app()
    application.dependency_overrides[get_store] = lambda: s
    application.dependency_overrides[get_store_any] = lambda: s
    application.dependency_overrides[get_settings] = _test_settings

    with TestClient(application, raise_server_exceptions=True) as c:
        yield c

    application.dependency_overrides.clear()


# ── Fixtures de entidades de domínio ──────────────────────────────────────────

@pytest.fixture
def sample_municipio_critico() -> Municipio:
    """Município real com perfil de deserto crítico: Barcelos (AM).

    Sem backhaul, sem acessos, renda baixa, alta exclusão digital.
    idd_score e nivel_deserto estão None — scorer ainda não rodou.
    """
    return Municipio(
        codigo_ibge="1300409",
        nome="Barcelos",
        uf="AM",
        regiao="Norte",
        populacao=30000,
        domicilios_total=8000,
        domicilios_sem_internet=7200,
        renda_per_capita=450.0,
        acessos_banda_larga=0,
        tem_backhaul=False,
        atualizado_em="2024-10-15T00:00:00+00:00",
    )


@pytest.fixture
def sample_municipio_conectado() -> Municipio:
    """Município real com boa conectividade: São Paulo (SP).

    Alta densidade de banda larga, renda elevada, tem backhaul.
    idd_score e nivel_deserto estão None — scorer ainda não rodou.
    """
    return Municipio(
        codigo_ibge="3550308",
        nome="São Paulo",
        uf="SP",
        regiao="Sudeste",
        populacao=12396372,
        domicilios_total=4200000,
        domicilios_sem_internet=210000,
        renda_per_capita=2800.0,
        acessos_banda_larga=3800000,
        tem_backhaul=True,
        atualizado_em="2024-10-15T00:00:00+00:00",
    )


@pytest.fixture
def scorer() -> IDDScorer:
    """IDDScorer com pesos padrão (infraestrutura=0.40, exclusao=0.30, renda=0.20, backhaul=0.10)."""
    return IDDScorer()
