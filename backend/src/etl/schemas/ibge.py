"""Schema Pydantic para os dados consolidados do IBGE por município.

IBGEMunicipioRaw é construído pelo ExtractStage cruzando três fontes:
- IBGE Localidades API: código, nome, UF, região
- IBGE SIDRA tabela 9514: população (Censo 2022)
- IBGE SIDRA tabela 9936: domicílios com/sem internet (Censo 2022)
- IBGE PNAD tabela 7395: rendimento per capita por UF (propagado aos municípios)
"""

from pydantic import BaseModel, computed_field


class IBGEMunicipioRaw(BaseModel):
    """Dados censitários consolidados de um município prontos para validação.

    Campos vêm pré-mesclados pelo ExtractStage; o ValidateStage apenas valida
    e converte para este tipo antes de repassar ao TransformStage.
    """

    codigo: str
    nome: str
    populacao: int
    domicilios_total: int
    domicilios_com_internet: int
    renda_per_capita: float
    uf: str
    regiao: str

    @computed_field
    @property
    def domicilios_sem_internet(self) -> int:
        """Domicílios sem acesso à internet; clampado em 0 para evitar negativos."""
        return max(0, self.domicilios_total - self.domicilios_com_internet)
