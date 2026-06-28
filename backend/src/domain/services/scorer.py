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

    Quando não há dados ANATEL (acessos_banda_larga == 0 e tem_backhaul == False),
    os pesos de infraestrutura e backhaul são zerados e redistribuídos
    proporcionalmente entre exclusão digital e renda, preservando a capacidade
    de classificar municípios apenas com dados do IBGE.

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

        Quando ANATEL indisponível, redistribui pesos entre exclusão e renda.

        Args:
            municipio: Instância de Municipio com campos de conectividade preenchidos.

        Returns:
            IDDScore com score, nivel, componentes e fator de confiança.
        """
        tem_dados_anatel = municipio.acessos_banda_larga > 0 or municipio.tem_backhaul

        if tem_dados_anatel:
            peso_infra = self.peso_infraestrutura
            peso_exclusao = self.peso_exclusao
            peso_renda = self.peso_renda
            peso_backhaul = self.peso_backhaul
        else:
            # Sem ANATEL: redistribui 50% infra + 10% backhaul entre exclusão e renda
            peso_infra = 0.0
            peso_exclusao = 0.60
            peso_renda = 0.40
            peso_backhaul = 0.0

        if tem_dados_anatel:
            componente_infraestrutura = (
                (1.0 - min(municipio.densidade_banda_larga, 100.0) / 100.0)
                * 100.0
                * peso_infra
            )
        else:
            componente_infraestrutura = 0.0

        componente_exclusao = municipio.percentual_sem_internet * peso_exclusao

        componente_renda = (
            self._normalizar_renda(municipio.renda_per_capita) * 100.0 * peso_renda
        )

        if tem_dados_anatel:
            componente_backhaul = (0.0 if municipio.tem_backhaul else 100.0) * peso_backhaul
        else:
            componente_backhaul = 0.0

        score = max(
            0.0,
            min(
                100.0,
                componente_infraestrutura
                + componente_exclusao
                + componente_renda
                + componente_backhaul,
            ),
        )

        nivel = self._classificar_nivel(score)

        confianca = 1.0
        if not tem_dados_anatel:
            confianca -= 0.3
        if municipio.populacao == 0:
            confianca -= 0.4
        if municipio.domicilios_total == 0:
            confianca -= 0.3
        confianca = max(0.0, min(1.0, confianca))

        componentes: dict[str, float | bool] = {
            "infraestrutura": round(componente_infraestrutura, 4),
            "exclusao": round(componente_exclusao, 4),
            "renda": round(componente_renda, 4),
            "backhaul": round(componente_backhaul, 4),
            "tem_dados_anatel": tem_dados_anatel,
        }

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
        if score >= 55.0:
            return "CRITICO"
        if score >= 35.0:
            return "VULNERAVEL"
        if score >= 15.0:
            return "EMERGENTE"
        return "CONECTADO"
