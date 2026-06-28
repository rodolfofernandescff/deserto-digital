/**
 * MapaLegenda — Legenda interativa do mapa com pills por nível e contagem de estados
 */

'use client'

import { useMemo } from 'react'
import { NIVEL_COLORS, NIVEL_LABELS, nivelFromIdd } from '@/lib/constants'
import type { EstadoMapa } from '@/lib/types'
import type { NivelDeserto } from '@/lib/types'

interface MapaLegendaProps {
  estadosData?: EstadoMapa[]
}

const NIVEIS_ORDENADOS: NivelDeserto[] = ['CONECTADO', 'EMERGENTE', 'VULNERAVEL', 'CRITICO']

export function MapaLegenda({ estadosData }: MapaLegendaProps) {
  // Contagem de estados por nível (baseado no IDD médio)
  const contagem = useMemo(() => {
    const counts: Record<NivelDeserto, number> = {
      CONECTADO: 0,
      EMERGENTE: 0,
      VULNERAVEL: 0,
      CRITICO: 0,
    }
    estadosData?.forEach((e) => {
      const nivel = nivelFromIdd(e.idd_medio)
      counts[nivel]++
    })
    return counts
  }, [estadosData])

  return (
    <div
      className="mt-3 px-1"
      aria-label="Legenda do mapa de desertos digitais"
    >
      {/* Pills interativos por nível */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
        {NIVEIS_ORDENADOS.map((nivel) => (
          <div
            key={nivel}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/40
                       bg-surface/60 backdrop-blur-sm transition-all duration-200
                       hover:border-accent/30 hover:bg-surface/80 group"
          >
            <div
              className="w-2 h-2 rounded-full shrink-0 transition-transform group-hover:scale-125"
              style={{ backgroundColor: NIVEL_COLORS[nivel] }}
            />
            <span className="text-[10px] sm:text-[11px] font-medium text-text-base/70 group-hover:text-text-base/90 transition-colors">
              {NIVEL_LABELS[nivel]}
            </span>
            {estadosData && estadosData.length > 0 && (
              <span className="text-[9px] sm:text-[10px] font-mono font-bold text-text-base/40 tabular-nums">
                {contagem[nivel]}
              </span>
            )}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-text-base/30 mt-2 text-center leading-snug">
        IDD médio por estado · cores quentes = maior vulnerabilidade
      </p>
    </div>
  )
}
