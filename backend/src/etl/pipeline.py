"""Orquestrador do pipeline ETL: extract → validate → transform → score → persist.

Uso via CLI:
    python -m src.etl.pipeline
    python -m src.etl.pipeline --municipio 3550308
"""

import json
import logging
import sys
import time
from collections import Counter
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from dotenv import load_dotenv

# Load env variables for ANATEL_CSV_URL, etc
load_dotenv()

from src.domain.entities.municipio import Municipio
from src.etl.stages.extract import ExtractError, ExtractStage
from src.etl.stages.score import ScoreStage
from src.etl.stages.transform import TransformStage
from src.etl.stages.validate import CriticalValidationError, ValidateStage

logger = logging.getLogger(__name__)

_DEFAULT_OUTPUT = Path("/app/data/municipios.json")


@dataclass
class PipelineResult:
    """Relatório de execução do pipeline ETL."""

    total_municipios: int
    distribuicao_niveis: dict[str, int]
    mes_referencia: str
    duracao_segundos: float
    erros: list[str] = field(default_factory=list)
    sucesso: bool = True


class ETLPipeline:
    """Orquestra os quatro estágios ETL e persiste o resultado em JSON.

    Args:
        output_path: Caminho do arquivo de saída. Default: backend/data/municipios.json.
    """

    def __init__(self, output_path: str | Path | None = None) -> None:
        self.output_path = Path(output_path) if output_path else _DEFAULT_OUTPUT

    def run(self) -> PipelineResult:
        """Executa o pipeline completo e salva o resultado em output_path.

        Returns:
            PipelineResult com estatísticas e flag de sucesso.
        """
        inicio = time.monotonic()
        erros: list[str] = []

        try:
            municipios, mes_referencia, erros_etapas = self._rodar_etapas()
            erros.extend(erros_etapas)
            self._persistir(municipios, mes_referencia)

            distribuicao = dict(Counter(m.nivel_deserto for m in municipios if m.nivel_deserto))

            logger.info(
                "Pipeline concluído: %d municípios em %.1fs | saída: %s",
                len(municipios), time.monotonic() - inicio, self.output_path,
            )

            return PipelineResult(
                total_municipios=len(municipios),
                distribuicao_niveis=distribuicao,
                mes_referencia=mes_referencia,
                duracao_segundos=time.monotonic() - inicio,
                erros=erros,
                sucesso=True,
            )

        except (ExtractError, CriticalValidationError) as exc:
            logger.error("Pipeline interrompido: %s", exc)
            erros.append(str(exc))
            return PipelineResult(
                total_municipios=0,
                distribuicao_niveis={},
                mes_referencia="",
                duracao_segundos=time.monotonic() - inicio,
                erros=erros,
                sucesso=False,
            )
        except Exception as exc:
            logger.exception("Erro inesperado no pipeline")
            erros.append(f"Erro inesperado: {exc}")
            return PipelineResult(
                total_municipios=0,
                distribuicao_niveis={},
                mes_referencia="",
                duracao_segundos=time.monotonic() - inicio,
                erros=erros,
                sucesso=False,
            )

    def run_municipio_unico(self, codigo_ibge: str) -> Municipio:
        """Executa o pipeline completo e retorna apenas o município especificado.

        Útil para testes, debug e validação de um município específico sem
        precisar carregar os 5.570 em memória na API.

        Args:
            codigo_ibge: Código IBGE de 7 dígitos.

        Returns:
            Instância de Municipio com IDDScore calculado.

        Raises:
            ValueError: Se o código não for encontrado após o pipeline.
        """
        codigo = codigo_ibge.zfill(7)
        municipios, _, _ = self._rodar_etapas()

        municipio = next((m for m in municipios if m.codigo_ibge == codigo), None)
        if municipio is None:
            raise ValueError(
                f"Município '{codigo_ibge}' não encontrado. "
                f"Verifique se o código IBGE de 7 dígitos está correto."
            )
        return municipio

    # ── Internos ──────────────────────────────────────────────────────────────

    def _rodar_etapas(self) -> tuple[list[Municipio], str, list[str]]:
        """Executa extract → validate → transform → score e retorna (municipios, mes_ref, erros)."""
        # Stage 1: Extract
        extract_result = ExtractStage().run()
        erros = list(extract_result.erros)

        # Stage 2: Validate
        validate_result = ValidateStage().run(extract_result)
        # Adiciona sample de erros ao relatório (evita payload enorme)
        erros.extend(validate_result.erros_anatel[:20])
        erros.extend(validate_result.erros_ibge[:20])

        # Stage 3: Transform
        municipios = TransformStage().run(validate_result)

        # Stage 4: Score
        municipios_scored = ScoreStage().run(municipios)

        return municipios_scored, extract_result.mes_referencia, erros

    def _persistir(self, municipios: list[Municipio], mes_referencia: str) -> None:
        """Serializa municípios em JSON e grava em output_path com metadados."""
        self.output_path.parent.mkdir(parents=True, exist_ok=True)

        payload = {
            "gerado_em": datetime.now(UTC).isoformat(),
            "total": len(municipios),
            "mes_referencia": mes_referencia,
            "municipios": [m.model_dump(mode="json") for m in municipios],
        }

        json_text = json.dumps(payload, ensure_ascii=False, indent=2)
        self.output_path.write_text(json_text, encoding="utf-8")

        tamanho_mb = self.output_path.stat().st_size / 1024 / 1024
        logger.info("JSON salvo: %s (%.1f MB)", self.output_path, tamanho_mb)


# ── CLI ───────────────────────────────────────────────────────────────────────

def _configurar_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stdout,
    )
    # Silencia logs verbosos de bibliotecas externas
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


if __name__ == "__main__":
    import argparse

    _configurar_logging()

    parser = argparse.ArgumentParser(
        description="Deserto Digital ETL — gera backend/data/municipios.json",
    )
    parser.add_argument(
        "--municipio",
        metavar="CODIGO_IBGE",
        help="Executa o pipeline e exibe apenas um município (debug)",
    )
    parser.add_argument(
        "--output",
        metavar="CAMINHO",
        help="Caminho de saída (default: backend/data/municipios.json)",
    )
    args = parser.parse_args()

    pipeline = ETLPipeline(output_path=args.output)

    if args.municipio:
        try:
            m = pipeline.run_municipio_unico(args.municipio)
            print(json.dumps(m.model_dump(mode="json"), ensure_ascii=False, indent=2))
        except ValueError as exc:
            print(f"Erro: {exc}", file=sys.stderr)
            sys.exit(1)
    else:
        resultado = pipeline.run()
        print(f"\n{'='*50}")
        print(f"ETL {'OK' if resultado.sucesso else 'FALHOU'}")
        print(f"Municípios: {resultado.total_municipios}")
        print(f"Referência: {resultado.mes_referencia}")
        print(f"Duração:    {resultado.duracao_segundos:.1f}s")
        print("Distribuição de níveis:")
        for nivel, count in sorted(resultado.distribuicao_niveis.items()):
            pct = count / resultado.total_municipios * 100 if resultado.total_municipios else 0
            print(f"  {nivel:<12} {count:>5}  ({pct:.1f}%)")
        if resultado.erros:
            print(f"\nErros ({len(resultado.erros)}):")
            for e in resultado.erros[:10]:
                print(f"  • {e}")
        sys.exit(0 if resultado.sucesso else 1)

