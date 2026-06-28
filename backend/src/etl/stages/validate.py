"""Estágio de validação: converte dados brutos para schemas Pydantic tipados.

Registros inválidos são coletados em listas de erros — o pipeline continua.
Única exceção: se mais de 30% das linhas ANATEL falharem, algo está errado
com a fonte (CSV diferente do esperado) e levantamos CriticalValidationError.
"""

import logging
from dataclasses import dataclass, field

from pydantic import ValidationError

from src.etl.schemas.anatel import AnatelRowRaw
from src.etl.schemas.ibge import IBGEMunicipioRaw
from src.etl.stages.extract import ExtractResult

logger = logging.getLogger(__name__)

_TAXA_ERRO_LIMITE = 0.30  # 30% de erros → pipeline interrompido


class CriticalValidationError(Exception):
    """Taxa de erros de validação acima do limite aceitável — fonte de dados comprometida."""

    def __init__(self, message: str, taxa_erro: float, exemplos: list[str]) -> None:
        super().__init__(message)
        self.taxa_erro = taxa_erro
        self.exemplos = exemplos


@dataclass
class ValidateResult:
    """Saída do ValidateStage com registros tipados e relatório de erros."""

    anatel_validos: list[AnatelRowRaw]
    ibge_validos: list[IBGEMunicipioRaw]
    total_anatel: int
    total_ibge: int
    erros_anatel: list[str] = field(default_factory=list)
    erros_ibge: list[str] = field(default_factory=list)
    taxa_erro_anatel: float = 0.0


class ValidateStage:
    """Valida registros brutos do ExtractResult e devolve listas de instâncias Pydantic."""

    def run(self, extract_result: ExtractResult) -> ValidateResult:
        """Valida dados ANATEL e IBGE e retorna resultado estruturado.

        Raises:
            CriticalValidationError: Se taxa_erro_anatel > 30%.
        """
        anatel_validos, erros_anatel = self._validar_anatel(extract_result.anatel_rows)
        ibge_validos, erros_ibge = self._validar_ibge(extract_result.ibge_municipios)

        total_anatel = len(extract_result.anatel_rows)
        taxa_erro = len(erros_anatel) / total_anatel if total_anatel > 0 else 0.0

        logger.info(
            "Validação ANATEL: %d válidos / %d total (taxa erro: %.1f%%)",
            len(anatel_validos), total_anatel, taxa_erro * 100,
        )
        logger.info(
            "Validação IBGE: %d válidos / %d total (%d erros)",
            len(ibge_validos), len(extract_result.ibge_municipios), len(erros_ibge),
        )

        if taxa_erro > _TAXA_ERRO_LIMITE:
            raise CriticalValidationError(
                f"Taxa de erros ANATEL {taxa_erro:.1%} acima do limite {_TAXA_ERRO_LIMITE:.0%} "
                f"— verifique o formato do CSV (esperado: {list(AnatelRowRaw.model_fields.keys())})",
                taxa_erro=taxa_erro,
                exemplos=erros_anatel[:10],
            )

        return ValidateResult(
            anatel_validos=anatel_validos,
            ibge_validos=ibge_validos,
            total_anatel=total_anatel,
            total_ibge=len(extract_result.ibge_municipios),
            erros_anatel=erros_anatel,
            erros_ibge=erros_ibge,
            taxa_erro_anatel=taxa_erro,
        )

    # ── Helpers internos ──────────────────────────────────────────────────────

    @staticmethod
    def _validar_anatel(
        registros_brutos: list[dict],
    ) -> tuple[list[AnatelRowRaw], list[str]]:
        """Valida cada linha do CSV ANATEL contra AnatelRowRaw."""
        validos: list[AnatelRowRaw] = []
        erros: list[str] = []

        for i, row in enumerate(registros_brutos):
            try:
                validos.append(AnatelRowRaw.model_validate(row))
            except ValidationError as exc:
                msg = f"Linha {i + 1}: {exc.error_count()} erro(s) — {_resumo_erros(exc)}"
                erros.append(msg)
                if len(erros) <= 5:
                    logger.debug("ANATEL erro %s | row=%s", msg, _truncar(row))

        return validos, erros

    @staticmethod
    def _validar_ibge(
        registros_brutos: list[dict],
    ) -> tuple[list[IBGEMunicipioRaw], list[str]]:
        """Valida cada dict IBGE mesclado contra IBGEMunicipioRaw."""
        validos: list[IBGEMunicipioRaw] = []
        erros: list[str] = []

        for row in registros_brutos:
            try:
                validos.append(IBGEMunicipioRaw.model_validate(row))
            except ValidationError as exc:
                codigo = row.get("codigo", "?")
                msg = f"Município {codigo}: {_resumo_erros(exc)}"
                erros.append(msg)
                logger.debug("IBGE erro %s | row=%s", msg, _truncar(row))

        return validos, erros


# ── Helpers de formatação ─────────────────────────────────────────────────────

def _resumo_erros(exc: ValidationError) -> str:
    """Extrai a mensagem do primeiro erro de validação de forma legível."""
    erros = exc.errors(include_url=False)
    if not erros:
        return str(exc)
    primeiro = erros[0]
    loc = ".".join(str(p) for p in primeiro.get("loc", []))
    return f"{loc}: {primeiro.get('msg', '')}"


def _truncar(obj: dict, max_chars: int = 120) -> str:
    texto = str(obj)
    return texto[:max_chars] + "..." if len(texto) > max_chars else texto
