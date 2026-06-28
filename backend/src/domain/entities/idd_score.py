"""Value Object IDDScore — resultado imutável do cálculo do Índice de Digitalização Digital."""

from pydantic import BaseModel, ConfigDict, field_validator

_NIVEIS_VALIDOS = frozenset({"CRITICO", "VULNERAVEL", "EMERGENTE", "CONECTADO"})

_NIVEL_DISPLAY: dict[str, str] = {
    "CRITICO": "⚠️ Crítico",
    "VULNERAVEL": "🟠 Vulnerável",
    "EMERGENTE": "🟡 Emergente",
    "CONECTADO": "🟢 Conectado",
}


class IDDScore(BaseModel):
    """Value Object imutável que encapsula o resultado completo do cálculo do IDD.

    Score de 0 a 100 onde 100 representa a pior situação de deserto digital.
    Contém os componentes individuais para auditabilidade do cálculo.

    Attributes:
        score: Score final agregado entre 0.0 e 100.0.
        nivel: Classificação qualitativa do deserto digital.
        componentes: Breakdown por dimensão com chaves
                     "infraestrutura", "exclusao", "renda", "backhaul".
        confianca: Fator de confiabilidade entre 0.0 e 1.0, reduzido
                   proporcionalmente quando dados obrigatórios estão ausentes.
    """

    model_config = ConfigDict(frozen=True)

    score: float
    nivel: str
    componentes: dict[str, float | bool]
    confianca: float

    @field_validator("score")
    @classmethod
    def validar_score(cls, v: float) -> float:
        if not (0.0 <= v <= 100.0):
            raise ValueError(f"score deve estar entre 0.0 e 100.0, recebido {v}")
        return v

    @field_validator("nivel")
    @classmethod
    def validar_nivel(cls, v: str) -> str:
        if v not in _NIVEIS_VALIDOS:
            raise ValueError(f"nivel deve ser um de {sorted(_NIVEIS_VALIDOS)}, recebido '{v}'")
        return v

    @field_validator("confianca")
    @classmethod
    def validar_confianca(cls, v: float) -> float:
        if not (0.0 <= v <= 1.0):
            raise ValueError(f"confianca deve estar entre 0.0 e 1.0, recebido {v}")
        return v

    def nivel_display(self) -> str:
        """Retorna o label legível com emoji para exibição em interfaces."""
        return _NIVEL_DISPLAY.get(self.nivel, self.nivel)

    def is_deserto(self) -> bool:
        """True quando o município é classificado como deserto digital (crítico ou vulnerável)."""
        return self.nivel in ("CRITICO", "VULNERAVEL")
