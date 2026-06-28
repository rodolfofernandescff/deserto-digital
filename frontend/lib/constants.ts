import type { NivelDeserto } from './types'

// Paleta semaforizada — mantida sincronizada com tailwind.config.ts
export const NIVEL_COLORS: Record<NivelDeserto, string> = {
  CRITICO: '#E53E3E',
  VULNERAVEL: '#ED8936',
  EMERGENTE: '#ECC94B',
  CONECTADO: '#48BB78',
}

export const NIVEL_LABELS: Record<NivelDeserto, string> = {
  CRITICO: 'Crítico',
  VULNERAVEL: 'Vulnerável',
  EMERGENTE: 'Emergente',
  CONECTADO: 'Conectado',
}

export const NIVEL_EMOJI: Record<NivelDeserto, string> = {
  CRITICO: '🔴',
  VULNERAVEL: '🟠',
  EMERGENTE: '🟡',
  CONECTADO: '🟢',
}

// Tailwind class names (bg-) por nível — para uso em className
export const NIVEL_BG_CLASS: Record<NivelDeserto, string> = {
  CRITICO: 'bg-critico',
  VULNERAVEL: 'bg-vulneravel',
  EMERGENTE: 'bg-emergente',
  CONECTADO: 'bg-conectado',
}

export const NIVEL_TEXT_CLASS: Record<NivelDeserto, string> = {
  CRITICO: 'text-critico',
  VULNERAVEL: 'text-vulneravel',
  EMERGENTE: 'text-emergente',
  CONECTADO: 'text-conectado',
}

// Limites do IDD Score (sincronizados com src/domain/services/scorer.py)
export const IDD_LIMITES = {
  CRITICO: 60,
  VULNERAVEL: 40,
  EMERGENTE: 18,
} as const

/** Classifica o IDD numérico em nível qualitativo. */
export function nivelFromIdd(idd: number): NivelDeserto {
  if (idd >= IDD_LIMITES.CRITICO) return 'CRITICO'
  if (idd >= IDD_LIMITES.VULNERAVEL) return 'VULNERAVEL'
  if (idd >= IDD_LIMITES.EMERGENTE) return 'EMERGENTE'
  return 'CONECTADO'
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '')
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
}

function lerpColor(from: string, to: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(from)
  const [r2, g2, b2] = hexToRgb(to)
  const ratio = Math.max(0, Math.min(1, t))
  return rgbToHex(
    r1 + (r2 - r1) * ratio,
    g1 + (g2 - g1) * ratio,
    b1 + (b2 - b1) * ratio,
  )
}

/** Fallback para estados sem dados no mapa. */
export const COR_SEM_DADOS = '#3A3F55'

/** Cor contínua do mapa — verde (conectado) → vermelho (crítico). */
export function iddToColor(idd: number | null | undefined): string {
  if (idd == null || isNaN(idd)) return COR_SEM_DADOS
  const value = Math.max(0, Math.min(100, idd))

  if (value <= 12) return NIVEL_COLORS.CONECTADO
  if (value <= 25) {
    return lerpColor(NIVEL_COLORS.CONECTADO, NIVEL_COLORS.EMERGENTE, (value - 12) / 13)
  }
  if (value <= 45) {
    return lerpColor(NIVEL_COLORS.EMERGENTE, NIVEL_COLORS.VULNERAVEL, (value - 25) / 20)
  }
  return lerpColor(NIVEL_COLORS.VULNERAVEL, NIVEL_COLORS.CRITICO, Math.min(1, (value - 45) / 25))
}

// 27 Unidades Federativas do Brasil
export const UFS: Array<{ sigla: string; nome: string; regiao: string }> = [
  { sigla: 'AC', nome: 'Acre', regiao: 'Norte' },
  { sigla: 'AL', nome: 'Alagoas', regiao: 'Nordeste' },
  { sigla: 'AP', nome: 'Amapá', regiao: 'Norte' },
  { sigla: 'AM', nome: 'Amazonas', regiao: 'Norte' },
  { sigla: 'BA', nome: 'Bahia', regiao: 'Nordeste' },
  { sigla: 'CE', nome: 'Ceará', regiao: 'Nordeste' },
  { sigla: 'DF', nome: 'Distrito Federal', regiao: 'Centro-Oeste' },
  { sigla: 'ES', nome: 'Espírito Santo', regiao: 'Sudeste' },
  { sigla: 'GO', nome: 'Goiás', regiao: 'Centro-Oeste' },
  { sigla: 'MA', nome: 'Maranhão', regiao: 'Nordeste' },
  { sigla: 'MT', nome: 'Mato Grosso', regiao: 'Centro-Oeste' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul', regiao: 'Centro-Oeste' },
  { sigla: 'MG', nome: 'Minas Gerais', regiao: 'Sudeste' },
  { sigla: 'PA', nome: 'Pará', regiao: 'Norte' },
  { sigla: 'PB', nome: 'Paraíba', regiao: 'Nordeste' },
  { sigla: 'PR', nome: 'Paraná', regiao: 'Sul' },
  { sigla: 'PE', nome: 'Pernambuco', regiao: 'Nordeste' },
  { sigla: 'PI', nome: 'Piauí', regiao: 'Nordeste' },
  { sigla: 'RJ', nome: 'Rio de Janeiro', regiao: 'Sudeste' },
  { sigla: 'RN', nome: 'Rio Grande do Norte', regiao: 'Nordeste' },
  { sigla: 'RS', nome: 'Rio Grande do Sul', regiao: 'Sul' },
  { sigla: 'RO', nome: 'Rondônia', regiao: 'Norte' },
  { sigla: 'RR', nome: 'Roraima', regiao: 'Norte' },
  { sigla: 'SC', nome: 'Santa Catarina', regiao: 'Sul' },
  { sigla: 'SP', nome: 'São Paulo', regiao: 'Sudeste' },
  { sigla: 'SE', nome: 'Sergipe', regiao: 'Nordeste' },
  { sigla: 'TO', nome: 'Tocantins', regiao: 'Norte' },
]

// UF sigla → região
export const REGIOES: Record<string, string> = Object.fromEntries(
  UFS.map(({ sigla, regiao }) => [sigla, regiao]),
)

// Todas as regiões únicas para filtros
export const REGIOES_NOMES = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'] as const

export const DEFAULT_PAGE_SIZE = 25
export const MAX_SEARCH_RESULTS = 10
