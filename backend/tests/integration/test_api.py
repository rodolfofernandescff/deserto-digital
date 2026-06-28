"""Testes de integração dos endpoints HTTP.

Usa TestClient do FastAPI com store mockado (via dependency_overrides)
para cobrir fluxos completos de request/response sem I/O externo.

O store de cada teste contém 5 municípios fictícios:
  SP: Mun Alpha (5.0), Mun Beta (30.0), Mun Gamma (55.0)
  RJ: Mun Delta (75.0)
  AM: Mun Epsilon (12.0)
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def test_health_ok(client: TestClient) -> None:
    """GET /health deve retornar 200 com status 'ok' e store_loaded=True."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["store_loaded"] is True
    assert data["version"] == "1.0.0"


def test_municipios_sem_filtro(client: TestClient) -> None:
    """GET /municipios sem filtro deve retornar PaginatedResponse com todos os itens."""
    resp = client.get("/municipios")
    assert resp.status_code == 200
    data = resp.json()

    # Estrutura da resposta paginada
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert "has_next" in data

    assert data["total"] == 5
    assert data["page"] == 1
    assert len(data["items"]) == 5

    # Cada item deve ter os campos de MunicipioResumo
    primeiro = data["items"][0]
    assert "codigo_ibge" in primeiro
    assert "nome" in primeiro
    assert "idd_score" in primeiro
    assert "nivel_deserto" in primeiro
    assert "densidade_banda_larga" in primeiro
    assert "percentual_sem_internet" in primeiro


def test_municipio_por_codigo(client: TestClient) -> None:
    """GET /municipios/{codigo} deve retornar MunicipioDetalhe com todos os campos."""
    resp = client.get("/municipios/3300001")  # Mun Delta (RJ, CRITICO)
    assert resp.status_code == 200
    data = resp.json()

    assert data["codigo_ibge"] == "3300001"
    assert data["uf"] == "RJ"
    assert data["nivel_deserto"] == "CRITICO"

    # Campos exclusivos de MunicipioDetalhe
    assert "domicilios_total" in data
    assert "domicilios_sem_internet" in data
    assert "renda_per_capita" in data
    assert "acessos_banda_larga" in data
    assert "tem_backhaul" in data
    assert "componentes_idd" in data
    assert "atualizado_em" in data


def test_municipio_inexistente(client: TestClient) -> None:
    """GET /municipios/{codigo} com código inexistente deve retornar 404 com ErrorResponse."""
    resp = client.get("/municipios/9999999")
    assert resp.status_code == 404

    data = resp.json()
    assert "error" in data
    assert "status_code" in data
    assert data["status_code"] == 404


def test_ranking_limit(client: TestClient) -> None:
    """GET /ranking?limit=3 deve retornar exatamente 3 itens em ordem DESC de score."""
    resp = client.get("/ranking?limit=3")
    assert resp.status_code == 200
    items = resp.json()

    assert len(items) == 3

    # Primeiro deve ter o maior idd_score (Mun Delta = 75.0)
    scores = [item["idd_score"] for item in items]
    assert scores == sorted(scores, reverse=True), "Deve estar em ordem decrescente"
    assert scores[0] == pytest.approx(75.0)


def test_search_por_nome(client: TestClient) -> None:
    """GET /municipios/search?q=delta deve encontrar 'Mun Delta' sem distinção de case."""
    resp = client.get("/municipios/search?q=delta")
    assert resp.status_code == 200
    items = resp.json()

    assert len(items) == 1
    assert items[0]["codigo_ibge"] == "3300001"
    assert items[0]["uf"] == "RJ"


def test_estado_resumo(client: TestClient) -> None:
    """GET /estados/SP deve retornar EstadoResumo com 3 municípios e IDD médio correto."""
    resp = client.get("/estados/SP")
    assert resp.status_code == 200
    data = resp.json()

    assert data["uf"] == "SP"
    assert data["total_municipios"] == 3

    # IDD médio de SP: (5.0 + 30.0 + 55.0) / 3 = 30.0
    assert data["idd_medio"] == pytest.approx(30.0)

    # Pior = Mun Gamma (55.0), melhor = Mun Alpha (5.0)
    assert data["pior_municipio"]["codigo_ibge"] == "3530001"
    assert data["melhor_municipio"]["codigo_ibge"] == "3510001"

    # Distribuição de níveis em SP
    dist = data["distribuicao_niveis"]
    assert dist.get("CONECTADO", 0) == 1   # Mun Alpha
    assert dist.get("EMERGENTE", 0) == 1   # Mun Beta
    assert dist.get("VULNERAVEL", 0) == 1  # Mun Gamma


def test_admin_sem_token(client: TestClient) -> None:
    """POST /admin/refresh sem Authorization deve retornar 401."""
    resp = client.post("/admin/refresh")
    assert resp.status_code == 401

    data = resp.json()
    assert "error" in data
    assert data["status_code"] == 401


def test_cors_header(client: TestClient) -> None:
    """Response deve conter Access-Control-Allow-Origin para origem configurada."""
    resp = client.get("/health", headers={"Origin": "http://localhost:3000"})
    assert resp.status_code == 200
    assert "access-control-allow-origin" in resp.headers
