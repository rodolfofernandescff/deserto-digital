// Espelha os schemas Pydantic do backend (src/api/schemas/responses.py)

export type NivelDeserto = 'CRITICO' | 'VULNERAVEL' | 'EMERGENTE' | 'CONECTADO'

export interface MunicipioResumo {
  codigo_ibge: string
  nome: string
  uf: string
  regiao: string
  populacao: number
  idd_score: number | null
  nivel_deserto: NivelDeserto | null
  densidade_banda_larga: number
  percentual_sem_internet: number
}

export interface MunicipioDetalhe extends MunicipioResumo {
  domicilios_total: number
  domicilios_sem_internet: number
  renda_per_capita: number
  acessos_banda_larga: number
  tem_backhaul: boolean
  componentes_idd: ComponentesIDD | null
  fonte_anatel_mes: string | null
  atualizado_em: string
}

export interface ComponentesIDD {
  infraestrutura: number
  exclusao: number
  renda: number
  backhaul: number
}

export interface EstadoResumo {
  uf: string
  total_municipios: number
  distribuicao_niveis: Record<NivelDeserto, number>
  populacao_total: number
  idd_medio: number
  pior_municipio: MunicipioResumo
  melhor_municipio: MunicipioResumo
}

/** Item retornado por GET /estados — usado no mapa da homepage. */
export interface EstadoMapa {
  uf: string
  total_municipios: number
  idd_medio: number
  densidade_media: number
  pct_sem_internet_medio: number
  pct_vulneravel: number
  pct_emergente: number
  nivel_predominante: NivelDeserto
  distribuicao_niveis: Partial<Record<NivelDeserto, number>>
}

export interface StatsGerais {
  total_municipios: number
  distribuicao_niveis: Record<NivelDeserto, number>
  percentual_desertos: number
  municipios_sem_backhaul: number
  mes_referencia: string | null
  carregado_em: string | null
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  has_next: boolean
}

export interface HealthStatus {
  status: 'ok' | 'degraded'
  store_loaded: boolean
  version: string
}
