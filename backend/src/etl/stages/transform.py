"""Estágio de transformação: join ANATEL + IBGE → lista de entidades Municipio.

Agrega acessos ANATEL por código IBGE (múltiplas linhas por município, diferentes
tecnologias e operadoras), cruza com os dados censitários do IBGE e produz
instâncias de Municipio prontas para o ScoreStage.
"""

import logging
from collections import defaultdict
from datetime import UTC, datetime

from src.domain.entities.municipio import Municipio
from src.etl.schemas.anatel import AnatelMunicipioAgregado, AnatelRowRaw
from src.etl.schemas.ibge import IBGEMunicipioRaw
from src.etl.stages.validate import ValidateResult

logger = logging.getLogger(__name__)

_PRODUTOS_RESIDENCIAIS = frozenset({"INTERNET"})
_TIPOS_PESSOA_RESIDENCIAL = frozenset({"Pessoa Física", "Pessoa Fisica"})
_FIBER_TECHS = frozenset({"FTTH", "FTTB", "GPON", "XGSPON", "NGPON2"})

# Mapeamento hardcoded UF → Região (27 UFs conforme IBGE)
_UF_PARA_REGIAO: dict[str, str] = {
    "AC": "Norte", "AP": "Norte", "AM": "Norte", "PA": "Norte",
    "RO": "Norte", "RR": "Norte", "TO": "Norte",
    "AL": "Nordeste", "BA": "Nordeste", "CE": "Nordeste", "MA": "Nordeste",
    "PB": "Nordeste", "PE": "Nordeste", "PI": "Nordeste", "RN": "Nordeste",
    "SE": "Nordeste",
    "DF": "Centro-Oeste", "GO": "Centro-Oeste", "MT": "Centro-Oeste", "MS": "Centro-Oeste",
    "ES": "Sudeste", "MG": "Sudeste", "RJ": "Sudeste", "SP": "Sudeste",
    "PR": "Sul", "RS": "Sul", "SC": "Sul",
}


class TransformStage:
    """Realiza o join ANATEL × IBGE e produz entidades de domínio sem score."""

    def run(self, validate_result: ValidateResult) -> list[Municipio]:
        """Agrega ANATEL, cruza com IBGE e retorna Municipio prontos para scoring.

        Municípios sem dados ANATEL recebem acessos=0 e tem_backhaul=False.
        Erros na criação da entidade (violação de invariantes) são logados
        e o município é descartado.

        Args:
            validate_result: Saída tipada do ValidateStage.

        Returns:
            Lista de Municipio com idd_score=None, prontos para ScoreStage.
        """
        atualizado_em = datetime.now(UTC).isoformat()

        # 1. Agrega ANATEL por codigo_ibge
        agregados = self._agregar_anatel(validate_result.anatel_validos)
        logger.info("ANATEL: %d municípios após agregação", len(agregados))

        # 2. Determina mes_referencia da primeira linha válida
        mes_referencia = self._mes_referencia(validate_result.anatel_validos)

        # 3. Join IBGE × ANATEL
        municipios: list[Municipio] = []
        sem_anatel = 0
        erros_entidade = 0

        for ibge in validate_result.ibge_validos:
            anatel = agregados.get(ibge.codigo)

            if anatel is None:
                sem_anatel += 1

            try:
                m = self._criar_municipio(ibge, anatel, mes_referencia, atualizado_em)
                municipios.append(m)
            except Exception as exc:
                erros_entidade += 1
                logger.warning(
                    "Descartando município %s (%s): %s",
                    ibge.codigo, ibge.nome, exc,
                )

        logger.info(
            "Transform: %d municípios criados | %d sem ANATEL | %d erros de entidade",
            len(municipios), sem_anatel, erros_entidade,
        )
        return municipios

    # ── Helpers internos ──────────────────────────────────────────────────────

    @staticmethod
    def _agregar_anatel(
        rows: list[AnatelRowRaw],
    ) -> dict[str, AnatelMunicipioAgregado]:
        """Agrega acessos residenciais do mês mais recente, detectando fibra óptica."""
        periodo = TransformStage._periodo_mais_recente(rows)
        if not periodo:
            return {}

        ano_ref, mes_ref = periodo
        mes_referencia = f"{ano_ref:04d}-{mes_ref:02d}"
        acumulador: dict[str, dict] = defaultdict(
            lambda: {
                "nome": "",
                "uf": "",
                "acessos": 0,
                "operadoras": set(),
                "tem_fibra": False,
            }
        )

        for row in rows:
            if not TransformStage._linha_residencial_periodo(row, ano_ref, mes_ref):
                continue

            codigo = row.codigo_ibge.zfill(7)
            acc = acumulador[codigo]
            acc["nome"] = row.municipio
            acc["uf"] = row.uf.upper()
            acc["acessos"] += row.acessos
            if row.operadora:
                acc["operadoras"].add(row.operadora.strip())
            if TransformStage._linha_tem_fibra(row):
                acc["tem_fibra"] = True

        resultado: dict[str, AnatelMunicipioAgregado] = {}
        for codigo, acc in acumulador.items():
            resultado[codigo] = AnatelMunicipioAgregado(
                codigo_ibge=codigo,
                nome=acc["nome"],
                uf=acc["uf"],
                total_acessos=acc["acessos"],
                operadoras=sorted(acc["operadoras"]),
                tem_fibra=acc["tem_fibra"],
                mes_referencia=mes_referencia,
            )

        return resultado

    @staticmethod
    def _periodo_mais_recente(rows: list[AnatelRowRaw]) -> tuple[int, int] | None:
        maior_ano, maior_mes = 0, 0
        for row in rows:
            try:
                ano_int, mes_int = int(row.ano), int(row.mes)
            except (ValueError, TypeError):
                continue
            if (ano_int, mes_int) > (maior_ano, maior_mes):
                maior_ano, maior_mes = ano_int, mes_int
        return (maior_ano, maior_mes) if maior_ano else None

    @staticmethod
    def _linha_residencial_periodo(row: AnatelRowRaw, ano: int, mes: int) -> bool:
        try:
            if int(row.ano) != ano or int(row.mes) != mes:
                return False
        except (ValueError, TypeError):
            return False

        produto = (row.tipo_produto or "").strip().upper()
        pessoa = (row.tipo_pessoa or "").strip()
        if produto not in _PRODUTOS_RESIDENCIAIS:
            return False
        return pessoa in _TIPOS_PESSOA_RESIDENCIAL

    @staticmethod
    def _linha_tem_fibra(row: AnatelRowRaw) -> bool:
        tecnologia = (row.tecnologia or "").strip().upper()
        meio = (row.meio_acesso or "").strip().lower()
        return tecnologia in _FIBER_TECHS or "fibra" in meio

    @staticmethod
    def _criar_municipio(
        ibge: IBGEMunicipioRaw,
        anatel: AnatelMunicipioAgregado | None,
        mes_referencia: str,
        atualizado_em: str,
    ) -> Municipio:
        """Instancia a entidade Municipio a partir de dados IBGE + ANATEL opcionais."""
        acessos = anatel.total_acessos if anatel else 0
        regiao = ibge.regiao or _UF_PARA_REGIAO.get(ibge.uf.upper(), "")

        return Municipio(
            codigo_ibge=ibge.codigo.zfill(7),
            nome=ibge.nome,
            uf=ibge.uf.upper(),
            regiao=regiao,
            populacao=ibge.populacao,
            domicilios_total=ibge.domicilios_total,
            domicilios_sem_internet=ibge.domicilios_sem_internet,
            renda_per_capita=float(ibge.renda_per_capita),
            acessos_banda_larga=acessos,
            tem_backhaul=anatel.tem_fibra if anatel else False,
            atualizado_em=atualizado_em,
            fonte_anatel_mes=anatel.mes_referencia if anatel else mes_referencia,
        )

    @staticmethod
    def _mes_referencia(rows: list[AnatelRowRaw]) -> str:
        """Retorna o mês de referência mais recente entre os registros válidos."""
        maior_ano, maior_mes = 0, 0
        for row in rows:
            try:
                a, m = int(row.ano), int(row.mes)
                if (a, m) > (maior_ano, maior_mes):
                    maior_ano, maior_mes = a, m
            except (ValueError, TypeError):
                pass
        return f"{maior_ano:04d}-{maior_mes:02d}" if maior_ano else ""
