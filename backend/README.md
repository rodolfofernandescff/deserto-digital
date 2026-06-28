# Deserto Digital — Backend

API REST que expõe dados de conectividade digital por município brasileiro.

## Arquitetura

```
fontes externas → ETL pipeline → data/municipios.json → InMemoryStore → FastAPI
```

Sem banco de dados: o ETL gera um único arquivo JSON (~2MB, 5.570 municípios)
que é carregado integralmente em memória na inicialização da API.

## Pré-requisitos

- Python 3.12+
- (opcional) Docker + Docker Compose

## Setup local

```bash
cp .env.example .env       # editar ADMIN_TOKEN antes de usar
make install               # pip install -e ".[dev]"
make etl                   # baixa ANATEL + IBGE e gera data/municipios.json
make run                   # sobe em http://localhost:8000
```

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/municipios` | Lista paginada com filtro `?uf=SP` |
| GET | `/municipios/{codigo}` | Detalhe pelo código IBGE de 7 dígitos |
| GET | `/ranking` | Top municípios por score IDD (`?uf=&limit=`) |
| GET | `/estados/{uf}/resumo` | Estatísticas agregadas por UF |
| POST | `/admin/refresh` | Re-executa ETL (requer `X-Admin-Token`) |

Documentação interativa disponível em `/docs` (Swagger UI).

## Testes

```bash
make test           # todos os testes
make test-unit      # apenas unitários (sem I/O)
```

## Docker

```bash
docker compose up --build
```

## Qualidade de código

```bash
make lint           # ruff check
make format         # ruff format + ruff check --fix
```
