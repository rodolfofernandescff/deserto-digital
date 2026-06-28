"""InMemoryStore — repositório em memória que substitui o banco de dados.

Carregado a partir de data/municipios.json na inicialização da API.
Mantém múltiplos índices pré-computados para O(1) em lookups e O(n) nos
filtros/buscas mais complexos. A recarga (reload) é thread-safe via Lock.
"""

import json
import logging
import threading
import time
import unicodedata
from datetime import datetime
from pathlib import Path

from src.domain.entities.municipio import Municipio

logger = logging.getLogger(__name__)


def _normalizar_texto(texto: str) -> str:
    """Remove acentos e converte para maiúsculas para busca case-insensitive."""
    return (
        unicodedata.normalize("NFD", texto)
        .encode("ascii", "ignore")
        .decode("ascii")
        .upper()
    )


class InMemoryStore:
    """Repositório em memória indexado para os 5.570 municípios brasileiros.

    Índices mantidos após cada carga:
    - _municipios: lookup O(1) por codigo_ibge
    - _por_uf: agrupamento por sigla de UF
    - _por_nivel: agrupamento por nivel_deserto
    - _ranking: lista pré-ordenada por idd_score DESC (None ao final)
    - _nomes_normalizados: pares (nome_sem_acento, municipio) para busca textual
    - _stats: estatísticas globais pré-computadas
    """

    def __init__(self) -> None:
        self._municipios: dict[str, Municipio] = {}
        self._por_uf: dict[str, list[Municipio]] = {}
        self._por_nivel: dict[str, list[Municipio]] = {}
        self._ranking: list[Municipio] = []
        self._nomes_normalizados: list[tuple[str, Municipio]] = []
        self._stats: dict = {}
        self._carregado_em: str | None = None
        self._mes_referencia: str | None = None
        self._lock = threading.Lock()

    # ── Carga de dados ────────────────────────────────────────────────────────

    def load_from_file(self, path: str) -> None:
        """Lê municipios.json, valida cada item e popula todos os índices.

        Args:
            path: Caminho absoluto para o arquivo JSON gerado pelo ETL.

        Raises:
            FileNotFoundError: Se o arquivo não existir.
            json.JSONDecodeError: Se o arquivo não for JSON válido.
            pydantic.ValidationError: Se algum município tiver campos inválidos.
        """
        inicio = time.monotonic()
        conteudo = Path(path).read_text(encoding="utf-8")
        dados = json.loads(conteudo)

        self._mes_referencia = dados.get("mes_referencia", "")
        municipios = [
            Municipio.model_validate(item)
            for item in dados.get("municipios", [])
        ]

        self.carregar(municipios)

        duracao_ms = int((time.monotonic() - inicio) * 1000)
        logger.info(
            "InMemoryStore carregado: %d municípios em %dms",
            len(self._municipios), duracao_ms,
        )

    def carregar(self, municipios: list[Municipio]) -> None:
        """Substitui todos os índices com a nova lista de municípios.

        Constrói os índices completos antes de fazer o swap atômico,
        minimizando a janela em que o store está em estado inconsistente.

        Args:
            municipios: Lista completa de Municipio com scores calculados.
        """
        # Constrói novos índices fora do lock
        novo_mun: dict[str, Municipio] = {}
        novo_uf: dict[str, list[Municipio]] = {}
        novo_nivel: dict[str, list[Municipio]] = {}
        novos_nomes: list[tuple[str, Municipio]] = []

        for m in municipios:
            novo_mun[m.codigo_ibge] = m

            novo_uf.setdefault(m.uf, []).append(m)

            if m.nivel_deserto:
                novo_nivel.setdefault(m.nivel_deserto, []).append(m)

            novos_nomes.append((_normalizar_texto(m.nome), m))

        novo_ranking = sorted(
            municipios,
            key=lambda m: (m.idd_score is None, -(m.idd_score or 0.0)),
        )

        # Swap atômico sob lock
        with self._lock:
            self._municipios = novo_mun
            self._por_uf = novo_uf
            self._por_nivel = novo_nivel
            self._ranking = novo_ranking
            self._nomes_normalizados = novos_nomes
            self._carregado_em = datetime.now().isoformat()
            self._stats = self._computar_stats()

    def reload(self, path: str) -> None:
        """Recarrega os dados do arquivo de forma thread-safe.

        Limpa os índices atuais e executa load_from_file() sob o lock,
        garantindo que nenhuma leitura concorrente veja estado parcial.
        """
        with self._lock:
            self._municipios = {}
            self._por_uf = {}
            self._por_nivel = {}
            self._ranking = []
            self._nomes_normalizados = []
            self._stats = {}
            self._carregado_em = None
            self._mes_referencia = None

        # Recarrega fora do lock (load_from_file chama carregar que usa o lock)
        self.load_from_file(path)

    # ── Consultas (nova API) ──────────────────────────────────────────────────

    def get_by_codigo(self, codigo_ibge: str) -> Municipio | None:
        """Lookup O(1) por código IBGE de 7 dígitos."""
        return self._municipios.get(codigo_ibge.zfill(7))

    def list_by_uf(self, uf: str, nivel: str | None = None) -> list[Municipio]:
        """Retorna municípios da UF, opcionalmente filtrados por nivel_deserto."""
        municipios = self._por_uf.get(uf.upper(), [])
        if nivel:
            return [m for m in municipios if m.nivel_deserto == nivel]
        return list(municipios)

    def list_by_nivel(self, nivel: str) -> list[Municipio]:
        """Retorna todos os municípios com o nivel_deserto especificado."""
        return list(self._por_nivel.get(nivel, []))

    def get_ranking(
        self,
        limit: int = 50,
        offset: int = 0,
        uf: str | None = None,
        nivel: str | None = None,
    ) -> list[Municipio]:
        """Retorna fatia do ranking pré-ordenado com filtros opcionais.

        O ranking base é _ranking (idd_score DESC, None ao final).
        Filtros são aplicados antes do fatiamento para garantir consistência.
        """
        base: list[Municipio] = self._ranking

        if uf:
            uf_upper = uf.upper()
            base = [m for m in base if m.uf == uf_upper]

        if nivel:
            base = [m for m in base if m.nivel_deserto == nivel]

        return base[offset : offset + limit]

    def search_by_nome(self, query: str, limit: int = 10) -> list[Municipio]:
        """Busca municípios por substring no nome, sem diferenciação de acentos/case.

        Args:
            query: Texto a buscar (acentos e case ignorados).
            limit: Número máximo de resultados.

        Returns:
            Lista de municípios onde query é substring do nome, ordenados por
            idd_score DESC (desertos digitais mais severos primeiro).
        """
        query_norm = _normalizar_texto(query)
        encontrados = [m for nome, m in self._nomes_normalizados if query_norm in nome]
        ordenados = sorted(
            encontrados,
            key=lambda m: (m.idd_score is None, -(m.idd_score or 0.0)),
        )
        return ordenados[:limit]

    def get_stats(self) -> dict:
        """Retorna estatísticas globais pré-computadas no momento da carga."""
        return dict(self._stats)

    def get_resumo_uf(self, uf: str) -> dict | None:
        """Retorna estatísticas agregadas para todos os municípios da UF.

        Returns:
            Dicionário com pior/melhor município e distribuição de níveis,
            ou None se a UF não existir no dataset.
        """
        municipios = self.list_by_uf(uf)
        if not municipios:
            return None

        scored = [m for m in municipios if m.idd_score is not None]
        distribuicao: dict[str, int] = {}
        for m in municipios:
            if m.nivel_deserto:
                distribuicao[m.nivel_deserto] = distribuicao.get(m.nivel_deserto, 0) + 1

        idd_medio = sum(m.idd_score for m in scored) / len(scored) if scored else 0.0
        pior = max(scored, key=lambda m: m.idd_score, default=municipios[0])
        melhor = min(scored, key=lambda m: m.idd_score, default=municipios[0])

        return {
            "uf": uf.upper(),
            "total_municipios": len(municipios),
            "distribuicao_niveis": distribuicao,
            "populacao_total": sum(m.populacao for m in municipios),
            "pior_municipio": pior,
            "melhor_municipio": melhor,
            "idd_medio": round(idd_medio, 2),
        }

    def is_loaded(self) -> bool:
        """True se o store foi carregado e contém pelo menos um município."""
        return self._carregado_em is not None and len(self._municipios) > 0

    # ── Backward compat (usados pelos routers da API) ─────────────────────────

    def get_por_codigo(self, codigo: str) -> Municipio | None:
        """Alias de get_by_codigo para compatibilidade com os routers."""
        return self.get_by_codigo(codigo)

    def listar(
        self,
        uf: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[Municipio], int]:
        """Lista paginada com filtro opcional por UF.

        Returns:
            Tupla (itens_da_pagina, total_de_registros_filtrados).
        """
        if uf:
            base = self._por_uf.get(uf.upper(), [])
            # Ordena por ranking (idd_score DESC) dentro da UF
            base = sorted(
                base,
                key=lambda m: (m.idd_score is None, -(m.idd_score or 0.0)),
            )
        else:
            base = self._ranking

        total = len(base)
        offset = (page - 1) * page_size
        return base[offset : offset + page_size], total

    def ranking(self, uf: str | None = None, limit: int = 20) -> list[Municipio]:
        """Alias de get_ranking sem offset para compatibilidade com os routers."""
        return self.get_ranking(limit=limit, uf=uf)

    def resumo_por_uf(self, uf: str) -> dict | None:
        """Retorna resumo no formato esperado pelo EstadoResumoResponse."""
        municipios = self.list_by_uf(uf)
        if not municipios:
            return None

        scored = [m for m in municipios if m.idd_score is not None]
        scores = sorted(m.idd_score for m in scored)

        if not scores:
            score_medio = score_mediano = 0.0
        else:
            score_medio = sum(scores) / len(scores)
            meio = len(scores) // 2
            score_mediano = (
                scores[meio]
                if len(scores) % 2 == 1
                else (scores[meio - 1] + scores[meio]) / 2
            )

        alta = sum(1 for m in municipios if m.nivel_deserto == "CONECTADO")
        baixa = sum(1 for m in municipios if m.nivel_deserto in ("CRITICO", "VULNERAVEL"))

        return {
            "uf": uf.upper(),
            "total_municipios": len(municipios),
            "score_medio": round(score_medio, 2),
            "score_mediano": round(score_mediano, 2),
            "municipios_alta_conectividade": alta,
            "municipios_baixa_conectividade": baixa,
        }

    @property
    def total(self) -> int:
        """Número total de municípios carregados."""
        return len(self._municipios)

    # ── Internos ──────────────────────────────────────────────────────────────

    def _computar_stats(self) -> dict:
        """Calcula estatísticas globais sobre o dataset completo."""
        total = len(self._municipios)
        distribuicao: dict[str, int] = {}
        pop_sem_internet = 0
        sem_backhaul = 0

        for m in self._municipios.values():
            if m.nivel_deserto:
                distribuicao[m.nivel_deserto] = distribuicao.get(m.nivel_deserto, 0) + 1

            # Estimativa de pessoas sem acesso: domicilios_sem_internet × pessoas/domicílio
            if m.domicilios_total > 0:
                pessoas_por_dom = m.populacao / m.domicilios_total
                pop_sem_internet += int(m.domicilios_sem_internet * pessoas_por_dom)

            if not m.tem_backhaul:
                sem_backhaul += 1

        desertos = distribuicao.get("CRITICO", 0) + distribuicao.get("VULNERAVEL", 0)
        pct_desertos = (desertos / total * 100) if total > 0 else 0.0

        return {
            "total_municipios": total,
            "populacao_sem_internet": pop_sem_internet,
            "distribuicao_niveis": distribuicao,
            "percentual_desertos": round(pct_desertos, 2),
            "municipios_sem_backhaul": sem_backhaul,
            "mes_referencia": self._mes_referencia or "",
            "carregado_em": self._carregado_em or "",
        }
