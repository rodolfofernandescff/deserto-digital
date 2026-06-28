"""Motor de cálculo do IDD (Índice de Digitalização Digital).

Zero dependências externas além da stdlib — testável isoladamente e
portável sem qualquer framework.
"""

import math

from src.domain.entities.idd_score import IDDScore
from src.domain.entities.municipio import Municipio

_RENDA_MAX = 10_000.0


class IDDScorer:
    """Calcula o IDDScore de um município a partir de seus campos de conectividade.

    Score de 0 a 100 onde 100 representa o pior cenário de deserto digital.
    Cada dimensão contribui proporcionalmente ao seu peso; a soma é clampada
    em [0.0, 100.0] como rede de segurança para pesos personalizados.

    Usage:
        scorer = IDDScorer()
        idd = scorer.calculate(municipio)
    """

    def __init__(
        self,
        peso_infraestrutura: float = 0.40,
        peso_exclusao: float = 0.30,
        peso_renda: float = 0.20,
        peso_backhaul: float = 0.10,
    ) -> None:
        self.peso_infraestrutura = peso_infraestrutura
        self.peso_exclusao = peso_exclusao
        self.peso_renda = peso_renda
        self.peso_backhaul = peso_backhaul

    def calculate(self, municipio: Municipio) -> IDDScore:
        """Calcula e retorna o IDDScore para o município fornecido.

        Args:
            municipio: Instância de Municipio com campos de conectividade preenchidos.

        Returns:
            IDDScore com score, nivel, componentes e fator de confiança.
        """
        comp_infraestrutura = (
            (1.0 - min(municipio.densidade_banda_larga, 100.0) / 100.0)
            * 100.0
            * self.peso_infraestrutura
        )

        comp_exclusao = municipio.percentual_sem_internet * self.peso_exclusao

        comp_renda = (
            self._normalizar_renda(municipio.renda_per_capita)
            * 100.0
            * self.peso_renda
        )

        comp_backhaul = (0.0 if municipio.tem_backhaul else 100.0) * self.peso_backhaul

        componentes: dict[str, float] = {
            "infraestrutura": round(comp_infraestrutura, 6),
            "exclusao": round(comp_exclusao, 6),
            "renda": round(comp_renda, 6),
            "backhaul": round(comp_backhaul, 6),
        }

        score = max(0.0, min(100.0, sum(componentes.values())))
        nivel = self._classificar_nivel(score)
        confianca = self._calcular_confianca(municipio)

        return IDDScore(
            score=round(score, 4),
            nivel=nivel,
            componentes=componentes,
            confianca=round(confianca, 4),
        )

    def _normalizar_renda(self, valor: float) -> float:
        """Converte renda per capita para fator de pobreza via escala logarítmica.

        Quanto menor a renda, maior o retorno (mais próximo de 1.0).
        Renda >= RENDA_MAX retorna 0.0 (sem contribuição ao score de pobreza).
        """
        normalizado = math.log(max(valor, 1.0)) / math.log(_RENDA_MAX)
        return max(0.0, min(1.0, 1.0 - normalizado))

    def _classificar_nivel(self, score: float) -> str:
        """Mapeia score numérico para classificação qualitativa do deserto digital."""
        if score >= 60.0:
            return "CRITICO"
        if score >= 40.0:
            return "VULNERAVEL"
        if score >= 18.0:
            return "EMERGENTE"
        return "CONECTADO"

    def _calcular_confianca(self, municipio: Municipio) -> float:
        """Penaliza a confiança quando campos críticos estão ausentes ou zerados."""
        confianca = 1.0
        if municipio.populacao == 0:
            confianca -= 0.4
        if municipio.domicilios_total == 0:
            confianca -= 0.3
        if municipio.acessos_banda_larga == 0 and not municipio.tem_backhaul:
            confianca -= 0.2
        return max(0.0, min(1.0, confianca))
