import { NIVEL_COLORS, NIVEL_LABELS } from './constants'
import type { NivelDeserto } from './types'

// ── Formatação numérica ──────────────────────────────────────────────────────

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${formatNumber(value, decimals)}%`
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

// Formata score IDD com uma casa decimal
export function formatScore(score: number | null): string {
  if (score === null) return '—'
  return formatNumber(score, 1)
}

// ── Nível de deserto ─────────────────────────────────────────────────────────

export function nivelColor(nivel: NivelDeserto | null | undefined): string {
  if (!nivel) return '#6B7280'
  return NIVEL_COLORS[nivel]
}

export function nivelLabel(nivel: NivelDeserto | null | undefined): string {
  if (!nivel) return 'Sem dados'
  return NIVEL_LABELS[nivel]
}

// Retorna a Tailwind class de texto correspondente ao nível
export function nivelTextClass(nivel: NivelDeserto | null | undefined): string {
  const map: Record<NivelDeserto, string> = {
    CRITICO: 'text-critico',
    VULNERAVEL: 'text-vulneravel',
    EMERGENTE: 'text-emergente',
    CONECTADO: 'text-conectado',
  }
  return nivel ? (map[nivel] ?? 'text-gray-400') : 'text-gray-400'
}

// ── Strings ──────────────────────────────────────────────────────────────────

export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

// Alias em inglês para uso em componentes
export const normalizeText = normalizarTexto

// Trunca texto e adiciona reticências se necessário
export function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text
}

// ── Datas ────────────────────────────────────────────────────────────────────

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))
}

// Converte "YYYY-MM" em "Mês/YYYY" (ex: "2024-10" → "out/2024")
export function formatMesReferencia(mesRef: string | null | undefined): string {
  if (!mesRef) return '—'
  const [ano, mes] = mesRef.split('-')
  const data = new Date(Number(ano), Number(mes) - 1)
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(data)
}

// ── Cálculos auxiliares ──────────────────────────────────────────────────────

export function calcularPercentualDeserto(
  distribuicao: Partial<Record<NivelDeserto, number>>,
  total: number,
): number {
  if (total === 0) return 0
  const criticos = (distribuicao.CRITICO ?? 0) + (distribuicao.VULNERAVEL ?? 0)
  return (criticos / total) * 100
}
