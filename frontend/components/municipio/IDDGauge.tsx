/**
 * IDDGauge — Gauge semicircular do score IDD
 *
 * SVG puro: arco de 180° com stroke-dashoffset animado.
 * Score no centro, label do nível embaixo.
 *
 * Props:
 * - score: number | null — valor IDD (0–100)
 * - nivel: NivelDeserto | string | null — nível para cor
 * - size?: number — tamanho do gauge em pixels (default: 220)
 */

'use client'

import { useEffect, useState } from 'react'
import { nivelColor, nivelLabel } from '@/lib/utils'
import type { NivelDeserto } from '@/lib/types'

interface IDDGaugeProps {
  score: number | null
  nivel: NivelDeserto | string | null
  size?: number
}

export function IDDGauge({ score, nivel, size = 220 }: IDDGaugeProps) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  const cx = size / 2
  const cy = size / 2 + 10 // offset para centralizar o semicírculo visualmente

  // Semicírculo: comprimento do arco = π * r
  const halfCircumference = Math.PI * radius

  // Score normalizado (0–100) para fração do arco
  const normalizedScore = score !== null ? Math.min(Math.max(score, 0), 100) : 0
  const progress = normalizedScore / 100
  const dashOffset = halfCircumference * (1 - (animated ? progress : 0))

  const color = nivelColor(nivel as NivelDeserto)
  const label = nivelLabel(nivel as NivelDeserto)

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size * 0.65}
        viewBox={`0 0 ${size} ${size * 0.65}`}
        role="meter"
        aria-valuenow={score ?? undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Score IDD: ${score !== null ? score.toFixed(1) : 'sem dados'}`}
      >
        {/* Glow filter */}
        <defs>
          <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
        </defs>

        {/* Arco de fundo (cinza) */}
        <path
          d={describeArc(cx, cy, radius, 180, 360)}
          fill="none"
          stroke="#2D3148"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Arco glow (duplicado atrás para efeito de brilho) */}
        {score !== null && (
          <path
            d={describeArc(cx, cy, radius, 180, 360)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth + 8}
            strokeLinecap="round"
            strokeDasharray={halfCircumference}
            strokeDashoffset={dashOffset}
            opacity={0.15}
            filter="url(#gauge-glow)"
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        )}

        {/* Arco de progresso (cor do nível) */}
        {score !== null && (
          <path
            d={describeArc(cx, cy, radius, 180, 360)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={halfCircumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: `drop-shadow(0 0 6px ${color}66)`,
            }}
          />
        )}

        {/* Score numérico no centro */}
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          dominantBaseline="central"
          className="font-mono font-extrabold"
          style={{ fontSize: size * 0.2, fill: '#E2E8F0' }}
        >
          {score !== null ? score.toFixed(1) : '—'}
        </text>

        {/* Label "de 100" */}
        <text
          x={cx}
          y={cy + size * 0.08}
          textAnchor="middle"
          style={{ fontSize: 12, fill: '#6B7280' }}
        >
          de 100
        </text>
      </svg>

      {/* Label de nível abaixo do gauge */}
      <span
        className="text-sm font-semibold tracking-wide uppercase"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  )
}

// ── Helpers SVG ──────────────────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1'

  return [
    'M', start.x, start.y,
    'A', r, r, 0, largeArc, 0, end.x, end.y,
  ].join(' ')
}
