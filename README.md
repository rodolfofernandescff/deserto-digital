# Deserto Digital

Plataforma de visualização da exclusão digital no Brasil. Mapeia os 5.570 municípios brasileiros segundo um índice composto de vulnerabilidade à conectividade (IDD — Índice de Deserto Digital), cruzando dados abertos do IBGE (Censo 2022) e da ANATEL.

> **Contexto**: em 2022, cerca de 32% dos domicílios brasileiros ainda não tinham acesso à internet. Essa ausência não se distribui uniformemente — concentra-se em regiões com menor renda, infraestrutura precária de telecomunicações e alta dependência de serviços públicos digitais. Este projeto torna esses dados navegáveis.

---

## Demonstração

| Tela | Descrição |
|------|-----------|
| Homepage | Mapa interativo do Brasil com intensidade de exclusão por estado, estatísticas nacionais e legenda contínua de IDD |
| Ranking | Tabela paginada dos municípios mais vulneráveis, filtrável por UF e nível de risco |
| Estado | Agregação por UF: IDD médio, distribuição de municípios por nível, links individuais |
| Município | Ficha técnica com score IDD, breakdown dos quatro componentes e contexto regional |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│  Fontes de dados                                            │
│  IBGE SIDRA (tabelas 9514, 9936, 7395)  ─────────────┐     │
│  IBGE Localidades API                   ─────────────┤     │
│  ANATEL Open Data (ZIP ~300 MB)         ─────────────┘     │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────┐                  │
│  │  ETL Pipeline (Python)               │                  │
│  │  Extract → Transform → Load          │                  │
│  │  Saída: data/municipios.json (~4 MB) │                  │
│  └──────────────────────────────────────┘                  │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────┐                  │
│  │  FastAPI  (uvicorn, Python 3.12)     │                  │
│  │  InMemoryStore — sem banco de dados  │                  │
│  │  REST: /municipios /ranking /estados │                  │
│  └──────────────────────────────────────┘                  │
│                          │  HTTP / JSON                     │
│                          ▼                                  │
│  ┌──────────────────────────────────────┐                  │
│  │  Next.js 15  (App Router, RSC)       │                  │
│  │  Server Components → fetch no edge   │                  │
│  │  react-simple-maps, recharts, swr    │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

A arquitetura é deliberadamente sem banco de dados: o ETL serializa os dados processados em um único arquivo JSON que é carregado integralmente em memória no startup da API. Essa escolha reduz a latência de leitura para sub-milissegundo e elimina a dependência operacional de um SGBD para um dataset estático.

---

## Stack técnica

### Backend (`/backend`)

| Camada | Tecnologia | Decisão de design |
|--------|-----------|-------------------|
| Framework web | **FastAPI 0.115** | Validação automática com Pydantic v2, OpenAPI/Swagger integrado, lifespan hook para warm-up |
| Servidor ASGI | **Uvicorn** | Single-worker suficiente para dataset estático; sem necessidade de Gunicorn |
| Linguagem | **Python 3.12** | Type hints em todo o codebase, dataclasses nativas para modelos de domínio |
| HTTP client | **httpx** | Chamadas síncronas nas etapas ETL com timeout configurável (30–180s por tabela SIDRA) |
| Validação/serialização | **Pydantic v2** | Schemas de resposta com `model_validate` em todos os endpoints |
| Qualidade | **Ruff** (lint + format) | `ruff check + ruff format` com target `py312`; regras E, F, I, UP, B, SIM |
| Testes | **pytest + pytest-asyncio** | Testes unitários e de integração separados; fixture `TestClient` para API |
| Container | **Docker** | Multi-stage build; `docker-compose.yml` com volume para `data/` |

**Padrão de storage**: `InMemoryStore` com índices `dict[str, Municipio]` (lookup O(1) por código IBGE), listas pré-ordenadas para ranking e dicts por UF para filtros. Toda a estrutura é imutável após o carregamento.

**ETL em três estágios**:
- `Extract`: busca os 5.570 municípios na API de localidades do IBGE, então enriquece com três tabelas SIDRA (domicílios sem internet, acessos de banda larga, renda per capita por UF)
- `Transform`: normaliza cada indicador para [0, 100], aplica pesos e calcula o score IDD composto
- `Load`: serializa para JSON com schema versionado

### Frontend (`/frontend`)

| Camada | Tecnologia | Decisão de design |
|--------|-----------|-------------------|
| Framework | **Next.js 15** (App Router) | Server Components por padrão; `fetch` com `no-store` para dados dinâmicos; Client Components apenas onde há interatividade |
| Linguagem | **TypeScript 5.7** (strict) | Tipos end-to-end do schema da API até os componentes de UI |
| Estilo | **Tailwind CSS 3.4** | Design tokens customizados (`--color-critico`, `--color-emergente`, `--color-conectado`, etc.) definidos em `globals.css` via `@theme` |
| Tipografia | **Playfair Display** (display) · **DM Sans** (corpo) · **JetBrains Mono** (dados numéricos) | Carregado via `next/font/google` com `display: swap`; variáveis CSS injetadas no `<html>` |
| Mapa | **react-simple-maps 3.0** | SVG interativo com `ComposableMap + Geographies + Annotation`; GeoJSON dos estados via HTTPS |
| Gráficos | **recharts 2.13** | Usado nas fichas de município para visualizar o breakdown de componentes IDD |
| Data fetching (client) | **SWR 2.3** | Revalidação automática nos hooks `useMunicipios` e `useStats`; fallback para SSR |
| Acessibilidade | `prefers-reduced-motion` | Todas as animações CSS são desabilitadas via media query; `aria-label` em elementos interativos do mapa |

---

## Índice de Deserto Digital (IDD)

O IDD é um score composto de 0 a 100 (quanto maior, pior) construído a partir de quatro componentes:

| Componente | Fonte | Peso | Proxy |
|------------|-------|------|-------|
| **Exclusão digital** | IBGE Censo 2022 (tabela SIDRA 9514) | 40% | % domicílios sem internet |
| **Infraestrutura** | ANATEL — acessos de banda larga fixa | 30% | Acessos por domicílio (invertido) |
| **Capacidade econômica** | IBGE (tabela SIDRA 7395) — renda por UF | 20% | Renda per capita (invertido) |
| **Backhaul** | Derivado da densidade de acessos | 10% | Proxy de presença de fibra |

**Classificação de níveis:**

| Nível | Score IDD | Interpretação |
|-------|-----------|---------------|
| Crítico | ≥ 70 | Isolamento digital severo |
| Vulnerável | 50–69 | Acesso precário e instável |
| Emergente | 30–49 | Transição — infraestrutura insuficiente |
| Conectado | < 30 | Cobertura razoável |

---

## Estrutura do projeto

```
deserto_digital/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── main.py              # Factory FastAPI + middlewares CORS, rate-limit, security headers
│   │   │   ├── dependencies.py      # Injeção de dependência: Settings (pydantic-settings), InMemoryStore
│   │   │   ├── routers/
│   │   │   │   ├── municipios.py    # GET /municipios, /municipios/{codigo}
│   │   │   │   ├── ranking.py       # GET /ranking?uf=&limit=&nivel=
│   │   │   │   ├── estados.py       # GET /estados/{uf}/resumo
│   │   │   │   └── admin.py         # POST /admin/refresh (requer Bearer token)
│   │   │   └── schemas/
│   │   │       └── responses.py     # Pydantic models: MunicipioDetalhe, StatsGerais, etc.
│   │   ├── domain/
│   │   │   └── models.py            # Dataclasses de domínio: Municipio, ComponentesIDD
│   │   ├── etl/
│   │   │   ├── pipeline.py          # Orquestrador: Extract → Transform → Load
│   │   │   └── stages/
│   │   │       ├── extract.py       # IBGE SIDRA API + ANATEL ZIP download com cache 7 dias
│   │   │       ├── transform.py     # Normalização min-max + ponderação IDD
│   │   │       └── load.py          # Serialização JSON com schema versionado
│   │   └── store/
│   │       └── memory_store.py      # InMemoryStore: índices em memória, busca O(1)
│   ├── tests/
│   │   ├── unit/                    # Testes de transform, store, schemas
│   │   └── integration/             # Testes da API com TestClient
│   ├── Makefile                     # make install | etl | run | test | lint
│   ├── Dockerfile
│   └── pyproject.toml
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                 # Homepage: hero + mapa + estatísticas nacionais (RSC)
│   │   ├── ranking/page.tsx         # Ranking paginado com filtros (Client Component)
│   │   ├── estados/[uf]/page.tsx    # Página por UF (RSC + Server fetch)
│   │   └── municipio/[codigo]/      # Ficha do município com gráficos (Client)
│   ├── components/
│   │   ├── mapa/
│   │   │   ├── MapaBrasil.tsx       # SVG interativo com react-simple-maps + siglas dos estados
│   │   │   ├── MapaLegenda.tsx      # Legenda de escala contínua IDD
│   │   │   └── HomeMapSection.tsx   # Mapa + painel de detalhe do estado selecionado
│   │   ├── ranking/
│   │   │   └── RankingTable.tsx     # Tabela responsiva com IDD bar inline
│   │   └── ui/
│   │       └── Badge.tsx            # Badge colorido por nível de deserto
│   ├── lib/
│   │   ├── api.ts                   # Funções de fetch para o backend (getStats, getMunicipios, etc.)
│   │   ├── types.ts                 # Tipos TypeScript espelhando os schemas Pydantic
│   │   ├── constants.ts             # iddToColor, NIVEL_COLORS, UFS, NIVEL_LABELS
│   │   └── utils.ts                 # formatNumber, formatPercent, nivelColor
│   ├── tailwind.config.ts           # Tokens: cores semânticas, fontes, border-radius, box-shadow
│   └── next.config.ts
│
└── data/
    └── municipios.json              # Gerado pelo ETL (~4 MB, 5.570 municípios)
```

---

## Como executar localmente

### Pré-requisitos

- Python 3.12+
- Node.js 20+

### Backend

```bash
cd backend

# 1. Instalar dependências
pip install -e ".[dev]"

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env: definir ADMIN_TOKEN e opcionalmente CORS_ORIGINS

# 3. Executar o pipeline ETL (baixa ~300 MB de dados da ANATEL + IBGE)
#    Gera: data/municipios.json
make etl
# ou: python -m src.etl.pipeline

# 4. Subir a API
make run
# ou: uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

A documentação interativa fica disponível em `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend

# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000

# 3. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse `http://localhost:3000`.

### Docker (stack completa)

```bash
cd backend
docker compose up --build
```

---

## Decisões técnicas notáveis

**Sem banco de dados no runtime**: o dataset dos 5.570 municípios é estático entre execuções do ETL. Manter tudo em memória elimina round-trips de I/O e torna o deployment trivial (um único container sem dependências externas).

**Server Components para as rotas de dados**: as páginas de homepage, estado e município fazem `fetch` diretamente no servidor Next.js no momento do request, sem expor a URL do backend ao cliente. O Client Component (`'use client'`) é adotado apenas onde há interatividade (mapa, filtros, tabelas paginadas).

**ETL idempotente com cache local**: o download da ANATEL (~300 MB, atualizado anualmente) é cacheado em `.cache/` com TTL de 7 dias. Re-executar o ETL sem conexão de internet retorna os dados do cache sem erro.

**Rate limiting em sliding window**: o middleware de rate limit em memória (120 req/min por IP) é suficiente para um servidor single-worker. Em produção multi-réplica, o middleware estaria wired a um Redis via `slowapi`.

**Tipagem end-to-end**: os schemas Pydantic do backend e os tipos TypeScript do frontend são mantidos em sincronia manualmente. Cada campo do JSON de resposta tem um tipo explícito no `lib/types.ts`.

---

## Fontes de dados

| Dataset | Fonte | Periodicidade | Tamanho |
|---------|-------|---------------|---------|
| Domicílios sem internet | IBGE SIDRA — Tabela 9514 (Censo 2022) | Decenal | ~55k linhas |
| Acessos de banda larga fixa | ANATEL Open Data | Anual | ~300 MB (ZIP) |
| Renda domiciliar per capita | IBGE SIDRA — Tabela 7395 (PNADC 2022) | Anual | por UF |
| Lista de municípios + geometria | IBGE API de Localidades + GeoJSON (GitHub) | Estável | 5.570 registros |

---

## Licença

MIT — consulte [LICENSE](LICENSE).
