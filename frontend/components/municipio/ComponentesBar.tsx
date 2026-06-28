/**
 * ComponentesBar — Barras horizontais dos 4 componentes do IDD
 *
 * Cada barra mostra peso e valor do componente com animação de entrada.
 *
 * Props:
 * - componentes: Record<string, number> | null — valores dos 4 componentes
 */

'use client'

import { useEffect, useState } from 'react'
import type { ComponentesIDD } from '@/lib/types'

interface ComponentesBarProps {
  componentes: ComponentesIDD | Record<string, number> | null
}

const COMPONENTES_META = [
  { key: 'infraestrutura', label: 'Infraestrutura', peso: '40%', color: '#1B9AAA', icon: '📡' },
  { key: 'exclusao', label: 'Exclusão Digital', peso: '30%', color: '#E53E3E', icon: '🚫' },
  { key: 'renda', label: 'Renda', peso: '20%', color: '#ECC94B', icon: '💰' },
  { key: 'backhaul', label: 'Backhaul', peso: '10%', color: '#ED8936', icon: '🔌' },
] as const

export function ComponentesBar({ componentes }: ComponentesBarProps) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 200)
    return () => clearTimeout(timer)
  }, [])

  if (!componentes) {
    return (
      <div className="space-y-4 py-4">
        <h3 className="text-sm font-semibold text-text-base/70 uppercase tracking-wider">
          Componentes do IDD
        </h3>
        <p className="text-sm text-text-base/40">
          Dados dos componentes não disponíveis para este município.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 py-2">
      <h3 className="text-sm font-semibold text-text-base/70 uppercase tracking-wider">
        Componentes do IDD
      </h3>

      {COMPONENTES_META.map(({ key, label, peso, color, icon }, index) => {
        const value = (componentes as Record<string, number>)[key] ?? 0
        const width = animated ? Math.min(value, 100) : 0

        return (
          <div
            key={key}
            className="space-y-1.5"
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            {/* Label + peso + valor */}
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-text-base/70 font-medium flex items-center gap-1.5">
                <span className="text-xs" aria-hidden="true">{icon}</span>
                {label}{' '}
                <span className="text-text-base/30 text-xs">({peso})</span>
              </span>
              <span className="text-text-base/50 font-mono text-sm tabular-nums">
                {value.toFixed(1)}
              </span>
            </div>

            {/* Barra de progresso */}
            <div className="h-2.5 bg-border/40 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full relative"
                style={{
                  width: `${width}%`,
                  backgroundColor: color,
                  transition: `width 1s cubic-bezier(0.4, 0, 0.2, 1) ${index * 100}ms`,
                  boxShadow: `0 0 8px ${color}44`,
                }}
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${label}: ${value.toFixed(1)}`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
