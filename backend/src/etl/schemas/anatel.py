"""Schema Pydantic para validação dos registros brutos do CSV da ANATEL.

O CSV de Acessos SCM por Município muda o nome de colunas entre releases semestrais;
AliasChoices cobre as variações conhecidas sem quebrar validações futuras.
"""

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class AnatelRowRaw(BaseModel):
    """Linha bruta do CSV ANATEL com validação permissiva de tipos.

    Usa AliasChoices para absorver variações de nomenclatura entre versões do arquivo
    publicado em dados.anatel.gov.br — o pipeline de validação posterior fará
    as verificações semânticas mais rígidas.
    """

    model_config = ConfigDict(populate_by_name=True, str_strip_whitespace=True)

    codigo_ibge: str = Field(
        validation_alias=AliasChoices(
            "Código IBGE Município",
            "Código Município",
            "Código IBGE",
            "Codigo_Municipio",
            "cod_ibge",
            "codigo_ibge",
            "codigo_municipio",
        )
    )
    municipio: str = Field(
        validation_alias=AliasChoices(
            "Município",
            "Municipio",
            "municipio",
            "Nome Município",
            "nome_municipio",
        )
    )
    uf: str = Field(
        validation_alias=AliasChoices("UF", "uf", "Sigla UF", "sigla_uf")
    )
    ano: str = Field(
        validation_alias=AliasChoices("Ano", "ano", "ANO")
    )
    mes: str = Field(
        validation_alias=AliasChoices("Mês", "Mes", "mes", "MES", "Trimestre", "trimestre", "Período")
    )
    acessos: int = Field(
        validation_alias=AliasChoices(
            "Acessos",
            "acessos",
            "Total Acessos",
            "Qtd Acessos",
            "Quantidade Acessos",
        )
    )
    tecnologia: str | None = Field(
        None,
        validation_alias=AliasChoices("Tecnologia", "tecnologia"),
    )
    operadora: str | None = Field(
        None,
        validation_alias=AliasChoices(
            "Operadora",
            "operadora",
            "Empresa",
            "Prestadora",
            "Grupo Econômico",
        ),
    )
    tipo_produto: str | None = Field(
        None,
        validation_alias=AliasChoices("Tipo de Produto", "tipo_produto"),
    )
    tipo_pessoa: str | None = Field(
        None,
        validation_alias=AliasChoices("Tipo de Pessoa", "tipo_pessoa"),
    )
    meio_acesso: str | None = Field(
        None,
        validation_alias=AliasChoices("Meio de Acesso", "meio_acesso"),
    )


class AnatelMunicipioAgregado(BaseModel):
    """Resultado da agregação das linhas ANATEL por município.

    Consolida múltiplos registros de um mesmo código IBGE (diferentes tecnologias
    ou operadoras) em um único objeto com total de acessos e operadoras presentes.
    """

    codigo_ibge: str
    nome: str
    uf: str
    total_acessos: int
    operadoras: list[str]
    tem_fibra: bool
    mes_referencia: str  # "YYYY-MM"
