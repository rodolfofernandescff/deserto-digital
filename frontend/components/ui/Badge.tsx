/**
 * Badge — Indicador visual do nível de deserto digital
 *
 * Renderiza um badge colorido com emoji + label do nível.
 * Usa as cores semaforísticas do design system (Tailwind tokens).
 *
 * Props:
 * - nivel: NivelDeserto | string | null — nível de deserto
 * - size: 'sm' | 'md' — tamanho do badge (default: 'md')
 */

import type { NivelDeserto } from '@/lib/types'
import { NIVEL_LABELS } from '@/lib/constants'

interface BadgeProps {
  nivel: NivelDeserto | string | null
  size?: 'sm' | 'md'
}

// Mapeamento de nível → classes Tailwind (bg com opacidade + texto + borda)
const NIVEL_STYLES: Record<string, string> = {
  CRITICO: 'bg-critico/15 text-critico border-critico/30',
  VULNERAVEL: 'bg-vulneravel/15 text-vulneravel border-vulneravel/30',
  EMERGENTE: 'bg-emergente/15 text-emergente border-emergente/30',
  CONECTADO: 'bg-conectado/15 text-conectado border-conectado/30',
}

const EMOJIS: Record<string, string> = {
  CRITICO: '⚠️',
  VULNERAVEL: '🟠',
  EMERGENTE: '🟡',
  CONECTADO: '🟢',
}

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-[10px] gap-1',
  md: 'px-3 py-1 text-xs gap-1.5',
} as const

export function Badge({ nivel, size = 'md' }: BadgeProps) {
  if (!nivel) {
    return (
      <span className={`badge border border-border bg-border/20 text-text-base/50 ${SIZE_CLASSES[size]}`}>
        Sem dados
      </span>
    )
  }

  const key = nivel as NivelDeserto
  const style = NIVEL_STYLES[key] ?? 'bg-border/20 text-text-base/50 border-border'
  const emoji = EMOJIS[key] ?? ''
  const label = NIVEL_LABELS[key] ?? nivel

  return (
    <span
      className={`badge border ${style} ${SIZE_CLASSES[size]}`}
      title={`Nível: ${label}`}
    >
      {emoji && <span aria-hidden="true">{emoji}</span>}
      {label}
    </span>
  )
}
