"""Entidade Municipio — agregado raiz com dados de conectividade e scoring do IDD."""

from typing import Any

from pydantic import BaseModel, ConfigDict, computed_field, field_validator

_UFS_VALIDAS = frozenset({
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
    "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
    "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
})

_REGIOES_VALIDAS = frozenset({"Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"})


class Municipio(BaseModel):
    """Combina dados censitários do IBGE com métricas de banda larga da ANATEL.

    Campos obrigatórios chegam pelo ETL pipeline após join das duas fontes.
    Campos de scoring (idd_score, nivel_deserto, componentes_idd) são preenchidos
    pelo ScoreStage e permanecem None até lá.
    """

    model_config = ConfigDict(frozen=True)

    # --- Identificação ---
    codigo_ibge: str
    nome: str
    uf: str
    regiao: str

    # --- Dados populacionais (IBGE Censo 2022) ---
    populacao: int
    domicilios_total: int
    domicilios_sem_internet: int
    renda_per_capita: float

    # --- Dados de conectividade (ANATEL) ---
    acessos_banda_larga: int
    tem_backhaul: bool

    # --- Metadados ---
    atualizado_em: str
    fonte_anatel_mes: str | None = None

    # --- Scoring (preenchido pelo ScoreStage) ---
    idd_score: float | None = None
    nivel_deserto: str | None = None
    componentes_idd: dict | None = None

    # --- Campos calculados ---

    @computed_field
    @property
    def densidade_banda_larga(self) -> float:
        """Acessos por 100 domicílios; 0.0 quando domicilios_total == 0."""
        if self.domicilios_total == 0:
            return 0.0
        return (self.acessos_banda_larga / self.domicilios_total) * 100.0

    @computed_field
    @property
    def percentual_sem_internet(self) -> float:
        """Percentual de domicílios sem internet; 0.0 quando domicilios_total == 0."""
        if self.domicilios_total == 0:
            return 0.0
        return (self.domicilios_sem_internet / self.domicilios_total) * 100.0

    # --- Validators ---

    @field_validator("codigo_ibge")
    @classmethod
    def validar_codigo_ibge(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 7:
            raise ValueError(
                f"codigo_ibge deve ter exatamente 7 dígitos numéricos, recebido '{v}'"
            )
        return v

    @field_validator("uf")
    @classmethod
    def validar_uf(cls, v: str) -> str:
        normalizado = v.strip().upper()
        if normalizado not in _UFS_VALIDAS:
            raise ValueError(f"'{v}' não é uma UF válida. UFs aceitas: {sorted(_UFS_VALIDAS)}")
        return normalizado

    @field_validator("populacao", "domicilios_total", "acessos_banda_larga")
    @classmethod
    def validar_inteiros_nao_negativos(cls, v: int) -> int:
        if v < 0:
            raise ValueError(f"deve ser >= 0, recebido {v}")
        return v

    @field_validator("renda_per_capita")
    @classmethod
    def validar_renda(cls, v: float) -> float:
        if v < 0.0:
            raise ValueError(f"renda_per_capita deve ser >= 0.0, recebido {v}")
        return v

    def model_post_init(self, __context: Any) -> None:
        super().model_post_init(__context)
        if self.domicilios_sem_internet > self.domicilios_total:
            raise ValueError(
                f"domicilios_sem_internet ({self.domicilios_sem_internet}) "
                f"não pode exceder domicilios_total ({self.domicilios_total})"
            )
