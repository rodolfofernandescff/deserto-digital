'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapaBrasil } from './MapaBrasil'
import { MapaLegenda } from './MapaLegenda'
import type { EstadoMapa, StatsGerais } from '@/lib/types'

interface HomeMapSectionProps {
  estadosData: EstadoMapa[]
  stats?: StatsGerais | null
}

export function HomeMapSection({ estadosData, stats }: HomeMapSectionProps) {
  const [selectedUF, setSelectedUF] = useState<string | null>(null)

  const handleEstadoClick = (uf: string) => {
    setSelectedUF((current) => (current === uf ? null : uf))
  }

  const criticos = stats?.distribuicao_niveis?.CRITICO ?? 0
  const vulneraveis = stats?.distribuicao_niveis?.VULNERAVEL ?? 0
  const emergentes = stats?.distribuicao_niveis?.EMERGENTE ?? 0
  const pctDesertos = stats?.percentual_desertos ?? 0

  return (
    <div className="relative w-full flex-1 min-h-[340px] flex flex-col">

      {/* Stats overlay — desktop only, canto superior esquerdo */}
      {stats && (
        <div className="hidden lg:block absolute top-3 left-3 xl:top-4 xl:left-4 z-10 w-40 xl:w-48 pointer-events-none">
          <div className="stats-glass rounded-xl p-3.5 xl:p-4 space-y-3 pointer-events-auto">

            {/* Número principal */}
            <div>
              <div className="text-[2.25rem] xl:text-[2.75rem] font-mono font-black text-critico leading-none tabular-nums">
                {pctDesertos.toFixed(1)}%
              </div>
              <p className="text-[9px] xl:text-[10px] text-text-base/50 mt-1 leading-snug">
                em situação vulnerável
              </p>
            </div>

            {/* Stats secundárias */}
            <div className="pt-2.5 border-t border-border/30 space-y-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-base xl:text-lg font-mono font-bold text-text-base tabular-nums">
                  {(criticos + vulneraveis).toLocaleString('pt-BR')}
                </span>
                <span className="text-[9px] xl:text-[10px] text-text-base/50 leading-tight">
                  críticos ou<br />vulneráveis
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm xl:text-base font-mono font-semibold text-emergente tabular-nums">
                  {emergentes.toLocaleString('pt-BR')}
                </span>
                <span className="text-[9px] xl:text-[10px] text-text-base/50">em risco emergente</span>
              </div>
            </div>

            {/* CTA */}
            <Link
              href="/ranking"
              className="flex items-center gap-1 text-[10px] xl:text-xs text-accent hover:text-accent/80 transition-colors font-semibold pt-1"
            >
              Ranking completo
              <svg className="w-2.5 h-2.5 xl:w-3 xl:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* Mapa — preenche toda a área disponível */}
      <MapaBrasil
        estadosData={estadosData}
        estadoSelecionado={selectedUF}
        onEstadoClick={handleEstadoClick}
      />

      <MapaLegenda estadosData={estadosData} />
    </div>
  )
}
