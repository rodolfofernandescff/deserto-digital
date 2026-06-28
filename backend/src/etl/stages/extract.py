"""Estágio de extração: obtém dados brutos das fontes externas (ANATEL + IBGE).

Todas as chamadas HTTP são síncronas e sequenciais — sem async — para manter
o código simples e auditável.
"""

from __future__ import annotations

import contextlib
import csv
import io
import logging
import os
import re
import time
import zipfile
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

_IBGE_LOCALIDADES_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"
_SIDRA_BASE = "https://apisidra.ibge.gov.br/values"
# Censo 2022 — população residente por município
_SIDRA_POPULACAO_URL = f"{_SIDRA_BASE}/t/9514/n6/all/p/2022/v/all"
# Censo 2022 — domicílios com/sem internet (tabela 9936, totais agregados)
_SIDRA_DOM_TOTAL_URL = (
    f"{_SIDRA_BASE}/t/9936/n6/all/c2072/77584/c63/95826/c125/2932/p/2022/v/all"
)
_SIDRA_DOM_INTERNET_URL = (
    f"{_SIDRA_BASE}/t/9936/n6/all/c2072/77585/c63/95826/c125/2932/p/2022/v/all"
)
# PNAD — rendimento per capita por UF (fallback; tabela 7395 não publica N6)
_SIDRA_RENDA_UF_URL = f"{_SIDRA_BASE}/t/7395/n3/all/p/2022/v/4196"
_DEFAULT_ANATEL_ZIP_URL = (
    "https://www.anatel.gov.br/dadosabertos/paineis_de_dados/acessos/acessos_banda_larga_fixa.zip"
)
_CACHE_DIR = Path(__file__).resolve().parents[3] / ".cache"
_ANATEL_ZIP_CACHE = _CACHE_DIR / "acessos_banda_larga_fixa.zip"
_ANATEL_CSV_CACHE = _CACHE_DIR / "anatel_acessos_latest.csv"
_ANATEL_CSV_PATTERN = re.compile(r"^Acessos_Banda_Larga_Fixa_(\d{4})\.csv$")

_MAX_RETRIES = 3
_RETRY_SLEEP = 2
_CACHE_MAX_AGE_SECONDS = 7 * 24 * 3600


class ExtractError(Exception):
    """Falha irrecuperável na extração de dados de uma fonte externa."""

    def __init__(self, message: str, context: dict | None = None) -> None:
        super().__init__(message)
        self.context: dict = context or {}


@dataclass
class ExtractResult:
    """Saída bruta consolidada do ExtractStage."""

    anatel_rows: list[dict]
    ibge_municipios: list[dict]  # já mesclados: localidades + censo + renda
    mes_referencia: str
    erros: list[str] = field(default_factory=list)


class ExtractStage:
    """Baixa e consolida dados brutos de ANATEL e IBGE sem nenhuma transformação semântica."""

    def run(self) -> ExtractResult:
        """Executa todas as extrações e retorna dados brutos consolidados."""
        erros: list[str] = []

        # ── 1. ANATEL CSV ──────────────────────────────────────────────────────
        try:
            csv_bytes = self._baixar_csv_anatel()
            anatel_rows = self._parsear_csv(csv_bytes)
            mes_referencia = self._extrair_mes_referencia(anatel_rows)
            logger.info("ANATEL: %d linhas — referência %s", len(anatel_rows), mes_referencia)
        except ExtractError as exc:
            anatel_rows = []
            mes_referencia = ""
            erros.append(str(exc))
            logger.error("Falha ANATEL: %s | contexto: %s", exc, exc.context)

        # ── 2. IBGE Localidades ────────────────────────────────────────────────
        localidades = self._buscar_municipios_ibge()
        logger.info("IBGE Localidades: %d municípios", len(localidades))

        # ── 3. Censo 2022 (população + domicílios + internet) ──────────────────
        censo_por_codigo = self._buscar_dados_censo()
        logger.info("IBGE Censo 2022: %d municípios com dados", len(censo_por_codigo))

        # ── 4. Rendimento per capita (PNAD por UF, propagado aos municípios) ──
        renda_por_uf = self._buscar_renda_por_uf()
        logger.info("PNAD 7395: %d UFs com dados de renda", len(renda_por_uf))

        # ── 5. Mescla tudo em ibge_municipios ─────────────────────────────────
        ibge_municipios = [
            self._montar_municipio_ibge(loc, censo_por_codigo, renda_por_uf)
            for loc in localidades
        ]

        return ExtractResult(
            anatel_rows=anatel_rows,
            ibge_municipios=ibge_municipios,
            mes_referencia=mes_referencia,
            erros=erros,
        )

    # ── Métodos públicos de extração ──────────────────────────────────────────

    def _baixar_csv_anatel(self) -> bytes:
        """Baixa o CSV ANATEL (arquivo local, URL direta ou ZIP oficial em cache)."""
        csv_path = os.getenv("ANATEL_CSV_PATH", "").strip()
        if csv_path:
            path = Path(csv_path)
            if not path.is_file():
                raise ExtractError(
                    f"Arquivo ANATEL não encontrado: {csv_path}",
                    {"path": csv_path},
                )
            logger.info("ANATEL: lendo CSV local %s", path)
            return path.read_bytes()

        csv_url = os.getenv("ANATEL_CSV_URL", "").strip()
        if csv_url:
            return self._baixar_url_com_retry(csv_url, "ANATEL CSV")

        return self._baixar_csv_anatel_do_zip()

    def _baixar_csv_anatel_do_zip(self) -> bytes:
        """Extrai o CSV anual mais recente do ZIP oficial da ANATEL (com cache local)."""
        if _ANATEL_CSV_CACHE.is_file() and _arquivo_recente(_ANATEL_CSV_CACHE):
            logger.info("ANATEL: usando CSV em cache %s", _ANATEL_CSV_CACHE)
            return _ANATEL_CSV_CACHE.read_bytes()

        zip_url = os.getenv("ANATEL_ZIP_URL", _DEFAULT_ANATEL_ZIP_URL).strip()
        zip_bytes = self._obter_zip_anatel(zip_url)
        csv_name = self._selecionar_csv_anatel(zip_bytes)
        csv_bytes = self._extrair_arquivo_zip(zip_bytes, csv_name)

        _CACHE_DIR.mkdir(parents=True, exist_ok=True)
        _ANATEL_CSV_CACHE.write_bytes(csv_bytes)
        logger.info("ANATEL: CSV %s extraído (%d bytes)", csv_name, len(csv_bytes))
        return csv_bytes

    def _obter_zip_anatel(self, zip_url: str) -> bytes:
        if _ANATEL_ZIP_CACHE.is_file() and _arquivo_recente(_ANATEL_ZIP_CACHE):
            logger.info("ANATEL: usando ZIP em cache %s", _ANATEL_ZIP_CACHE)
            return _ANATEL_ZIP_CACHE.read_bytes()

        zip_bytes = self._baixar_url_com_retry(zip_url, "ANATEL ZIP")
        _CACHE_DIR.mkdir(parents=True, exist_ok=True)
        _ANATEL_ZIP_CACHE.write_bytes(zip_bytes)
        return zip_bytes

    def _baixar_url_com_retry(self, url: str, rotulo: str) -> bytes:
        ultimo_erro: Exception | None = None
        for tentativa in range(1, _MAX_RETRIES + 1):
            try:
                logger.info("%s download tentativa %d/%d", rotulo, tentativa, _MAX_RETRIES)
                resp = httpx.get(url, timeout=300, follow_redirects=True)
                resp.raise_for_status()
                logger.info("%s: %d bytes baixados", rotulo, len(resp.content))
                return resp.content
            except httpx.HTTPError as exc:
                ultimo_erro = exc
                logger.warning("Tentativa %d falhou: %s", tentativa, exc)
                if tentativa < _MAX_RETRIES:
                    time.sleep(_RETRY_SLEEP)

        raise ExtractError(
            f"{rotulo} indisponível após 3 tentativas",
            {"url": url, "ultimo_erro": str(ultimo_erro)},
        )

    @staticmethod
    def _selecionar_csv_anatel(zip_bytes: bytes) -> str:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as arquivo:
            candidatos = [
                nome
                for nome in arquivo.namelist()
                if _ANATEL_CSV_PATTERN.match(Path(nome).name)
            ]
            if not candidatos:
                raise ExtractError(
                    "ZIP ANATEL não contém CSV anual de acessos",
                    {"arquivos": arquivo.namelist()[:10]},
                )
            return max(candidatos, key=lambda nome: int(_ANATEL_CSV_PATTERN.match(Path(nome).name).group(1)))

    @staticmethod
    def _extrair_arquivo_zip(zip_bytes: bytes, nome_arquivo: str) -> bytes:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as arquivo:
            return arquivo.read(nome_arquivo)

    def _buscar_municipios_ibge(self) -> list[dict]:
        """Busca lista completa de municípios com hierarquia de UF e região."""
        resp = httpx.get(_IBGE_LOCALIDADES_URL, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def _buscar_dados_censo(self) -> dict[str, dict]:
        """Consolida população, domicílios totais e domicílios com internet por município."""
        resultado: dict[str, dict] = {}

        try:
            self._aplicar_sidra_absoluto(
                _SIDRA_POPULACAO_URL,
                resultado,
                campo="populacao",
                filtro_variavel=lambda nome: "popula" in nome and "percentual" not in nome,
            )
        except httpx.HTTPError as exc:
            logger.error("IBGE SIDRA 9514 falhou: %s", exc)

        try:
            self._aplicar_sidra_absoluto(
                _SIDRA_DOM_TOTAL_URL,
                resultado,
                campo="domicilios_total",
            )
        except httpx.HTTPError as exc:
            logger.error("IBGE SIDRA 9936 (total) falhou: %s", exc)

        try:
            self._aplicar_sidra_absoluto(
                _SIDRA_DOM_INTERNET_URL,
                resultado,
                campo="domicilios_com_internet",
            )
        except httpx.HTTPError as exc:
            logger.error("IBGE SIDRA 9936 (internet) falhou: %s", exc)

        return resultado

    def _aplicar_sidra_absoluto(
        self,
        url: str,
        acumulador: dict[str, dict],
        campo: str,
        filtro_variavel: Callable[[str], bool] | None = None,
    ) -> None:
        resp = httpx.get(url, timeout=120)
        resp.raise_for_status()
        for row in resp.json()[1:]:
            if not isinstance(row, dict):
                continue

            if _is_linha_percentual_sidra(row):
                continue

            var_nome = _nome_variavel_sidra(row)
            if filtro_variavel and not filtro_variavel(var_nome):
                continue

            codigo = str(row.get("D1C", "")).strip().zfill(7)
            valor = _parse_inteiro_sidra(row.get("V"))
            if len(codigo) < 6 or valor is None:
                continue

            acumulador.setdefault(
                codigo,
                {"populacao": 0, "domicilios_total": 0, "domicilios_com_internet": 0},
            )
            acumulador[codigo][campo] = valor

    def _buscar_renda_por_uf(self) -> dict[str, float]:
        """Retorna {sigla_uf: renda_per_capita} a partir da PNAD (tabela 7395, nível UF)."""
        try:
            resp = httpx.get(_SIDRA_RENDA_UF_URL, timeout=60)
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPError as exc:
            logger.error("IBGE SIDRA 7395 falhou: %s. Renda ficará zerada.", exc)
            return {}

        resultado: dict[str, float] = {}
        for row in data[1:]:
            if not isinstance(row, dict):
                continue

            uf = _sigla_uf_de_linha_sidra(row)
            valor = _parse_float_sidra(row.get("V"))
            if uf and valor is not None:
                resultado[uf] = valor

        return resultado

    # ── Helpers internos ──────────────────────────────────────────────────────

    def _parsear_csv(self, content: bytes) -> list[dict]:
        """Detecta encoding e delimitador do CSV ANATEL e retorna lista de dicts."""
        for encoding in ("utf-8-sig", "latin-1"):
            try:
                text = content.decode(encoding)
            except UnicodeDecodeError:
                continue

            for delimiter in (";", ",", "\t"):
                reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
                try:
                    rows = [dict(row) for row in reader]
                except csv.Error:
                    continue

                if rows and len(rows[0]) > 3:
                    logger.info(
                        "CSV ANATEL: encoding=%s delim=%r colunas=%s",
                        encoding,
                        delimiter,
                        list(rows[0].keys())[:6],
                    )
                    return rows

        raise ExtractError("Falha ao decodificar CSV ANATEL — encoding/delimitador desconhecido", {})

    def _montar_municipio_ibge(
        self,
        localidade: dict,
        censo: dict[str, dict],
        renda_por_uf: dict[str, float],
    ) -> dict:
        """Monta o dict consolidado de um município a partir das três fontes IBGE."""
        codigo = str(localidade["id"]).zfill(7)
        uf = self._uf_de_localidade(localidade)
        regiao = self._regiao_de_localidade(localidade)
        dados_censo = censo.get(codigo, {})

        return {
            "codigo": codigo,
            "nome": localidade.get("nome", ""),
            "uf": uf,
            "regiao": regiao,
            "populacao": dados_censo.get("populacao", 0),
            "domicilios_total": dados_censo.get("domicilios_total", 0),
            "domicilios_com_internet": dados_censo.get("domicilios_com_internet", 0),
            "renda_per_capita": renda_por_uf.get(uf, 0.0),
        }

    @staticmethod
    def _uf_de_localidade(localidade: dict) -> str:
        try:
            if localidade.get("microrregiao"):
                return localidade["microrregiao"]["mesorregiao"]["UF"]["sigla"]
            return localidade["regiao-imediata"]["regiao-intermediaria"]["UF"]["sigla"]
        except (KeyError, TypeError):
            return ""

    @staticmethod
    def _regiao_de_localidade(localidade: dict) -> str:
        try:
            if localidade.get("microrregiao"):
                return localidade["microrregiao"]["mesorregiao"]["UF"]["regiao"]["nome"]
            return localidade["regiao-imediata"]["regiao-intermediaria"]["UF"]["regiao"]["nome"]
        except (KeyError, TypeError):
            return ""

    @staticmethod
    def _extrair_mes_referencia(rows: list[dict]) -> str:
        """Determina "YYYY-MM" a partir das primeiras linhas do CSV ANATEL."""
        _ANO_KEYS = ("Ano", "ano", "ANO")
        _MES_KEYS = ("Mês", "Mes", "mes", "MES", "Trimestre", "trimestre", "Período")

        for row in rows[:20]:
            ano = next((row[k] for k in _ANO_KEYS if row.get(k)), None)
            mes = next((row[k] for k in _MES_KEYS if row.get(k)), None)
            if ano and mes:
                try:
                    return f"{int(str(ano).strip()):04d}-{int(str(mes).strip()):02d}"
                except (ValueError, TypeError):
                    continue
        return ""


def _nome_variavel_sidra(row: dict) -> str:
    return " ".join(str(row.get(key) or "") for key in ("D3N", "D6N", "D2N")).lower()


def _is_linha_percentual_sidra(row: dict) -> bool:
    return any("percentual" in str(row.get(key, "")).lower() for key in ("D2N", "D3N", "D6N"))


def _arquivo_recente(path: Path) -> bool:
    return (time.time() - path.stat().st_mtime) < _CACHE_MAX_AGE_SECONDS


def _parse_inteiro_sidra(valor: object) -> int | None:
    valor_str = str(valor or "").strip()
    if valor_str in ("", "-", "...", "X", "///"):
        return None
    with contextlib.suppress(ValueError):
        return int(float(valor_str.replace(",", ".")))
    return None


def _parse_float_sidra(valor: object) -> float | None:
    valor_str = str(valor or "").strip()
    if valor_str in ("", "-", "...", "X", "///"):
        return None
    with contextlib.suppress(ValueError):
        return float(valor_str.replace(",", "."))
    return None


_UF_POR_NOME = {
    "rondônia": "RO",
    "rondonia": "RO",
    "acre": "AC",
    "amazonas": "AM",
    "roraima": "RR",
    "pará": "PA",
    "para": "PA",
    "amapá": "AP",
    "amapa": "AP",
    "tocantins": "TO",
    "maranhão": "MA",
    "maranhao": "MA",
    "piauí": "PI",
    "piaui": "PI",
    "ceará": "CE",
    "ceara": "CE",
    "rio grande do norte": "RN",
    "paraíba": "PB",
    "paraiba": "PB",
    "pernambuco": "PE",
    "alagoas": "AL",
    "sergipe": "SE",
    "bahia": "BA",
    "minas gerais": "MG",
    "espírito santo": "ES",
    "espirito santo": "ES",
    "rio de janeiro": "RJ",
    "são paulo": "SP",
    "sao paulo": "SP",
    "paraná": "PR",
    "parana": "PR",
    "santa catarina": "SC",
    "rio grande do sul": "RS",
    "mato grosso do sul": "MS",
    "mato grosso": "MT",
    "goiás": "GO",
    "goias": "GO",
    "distrito federal": "DF",
}


def _sigla_uf_de_linha_sidra(row: dict) -> str:
    nome = str(row.get("D1N", "")).strip()
    if " - " in nome:
        return nome.rsplit(" - ", 1)[-1].strip().upper()
    return _UF_POR_NOME.get(nome.lower(), "")
