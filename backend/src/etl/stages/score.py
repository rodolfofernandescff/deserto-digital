"""Estágio de scoring: aplica IDDScorer a todos os municípios e atualiza os campos de score.

Como Municipio é um modelo frozen, a atualização usa model_copy(update={...}) para
criar novas instâncias imutáveis com os campos idd_score, nivel_deserto e componentes_idd
preenchidos. A lista original não é mutada.
"""

import logging
from collections import Counter

from src.domain.entities.municipio import Municipio
from src.domain.services.scorer import IDDScorer

logger = logging.getLogger(__name__)


class ScoreStage:
    """Calcula o IDDScore para cada município e retorna novas instâncias com score preenchido."""

    def run(self, municipios: list[Municipio]) -> list[Municipio]:
        """Aplica IDDScorer com pesos padrão e retorna lista completa com scores.

        Args:
            municipios: Lista de Municipio com idd_score=None vinda do TransformStage.

        Returns:
            Nova lista de Municipio com idd_score, nivel_deserto e componentes_idd
            preenchidos. A ordem é preservada.

        Raises:
            ValueError: Se a lista estiver vazia.
        """
        if not municipios:
            raise ValueError("ScoreStage.run() recebeu lista vazia de municípios")

        scorer = IDDScorer()
        resultado: list[Municipio] = []
        erros = 0

        for m in municipios:
            try:
                idd = scorer.calculate(m)
                scored = m.model_copy(
                    update={
                        "idd_score": idd.score,
                        "nivel_deserto": idd.nivel,
                        "componentes_idd": idd.componentes,
                    }
                )
                resultado.append(scored)
            except Exception as exc:
                erros += 1
                logger.warning("Score falhou para %s (%s): %s", m.codigo_ibge, m.nome, exc)
                resultado.append(m)  # mantém sem score em vez de descartar

        # Distribuição de níveis para log
        contagem = Counter(m.nivel_deserto for m in resultado if m.nivel_deserto)
        logger.info(
            "Score: %d municípios | %d erros | distribuição: %s",
            len(resultado),
            erros,
            dict(sorted(contagem.items())),
        )

        return resultado
