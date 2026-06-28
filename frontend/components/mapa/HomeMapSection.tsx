'use client'

import { useState } from 'react'
import { MapaBrasil } from './MapaBrasil'
import { MapaLegenda } from './MapaLegenda'
import Link from 'next/link'
import { NIVEL_LABELS } from '@/lib/constants'
import type { EstadoMapa } from '@/lib/types'
import { UFS } from '@/lib/constants'

interface HomeMapSectionProps {
  estadosData: EstadoMapa[]
}

export function HomeMapSection({ estadosData }: HomeMapSectionProps) {
  const [selectedUF, setSelectedUF] = useState<string | null>(null)

  const estado = selectedUF ? estadosData.find((e) => e.uf === selectedUF) : null
  const estadoNome = estado ? UFS.find((u) => u.sigla === estado.uf)?.nome ?? estado.uf : null

  const handleEstadoClick = (uf: string) => {
    setSelectedUF((current) => (current === uf ? null : uf))
  }

  return (
    <div className="relative w-full flex flex-col lg:flex-row gap-6 sm:gap-8">
      {/* Mapa — sem card, respira direto na página */}
      <div className="flex-1 min-w-0 relative">
        <MapaBrasil
          estadosData={estadosData}
          estadoSelecionado={selectedUF}
          onEstadoClick={handleEstadoClick}
        />
        <MapaLegenda />
      </div>

      {/* Painel lateral */}
      <div
        className={`w-full lg:w-72 xl:w-80 shrink-0 flex flex-col transition-all duration-300 ease-in-out ${
          selectedUF
            ? 'opacity-100 translate-y-0'
            : 'hidden lg:flex opacity-50'
        }`}
      >
        {estado ? (
          <div className="flex flex-col gap-6 animate-fade-in relative py-2">
            <button
              onClick={() => setSelectedUF(null)}
              className="absolute top-0 right-0 text-text-base/30 hover:text-text-base transition-colors"
              aria-label="Fechar painel"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Nome do estado — sem eyebrow */}
            <div className="pr-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-text-base leading-tight">
                {estadoNome}
              </h2>
              <p className="text-sm text-text-base/40 font-mono mt-0.5">{estado.uf}</p>
            </div>

            {/* IDD domina */}
            <div>
              <span className="text-6xl sm:text-7xl font-mono font-extrabold text-accent leading-none tabular-nums">
                {estado.idd_medio.toFixed(1)}
              </span>
              <p className="text-xs text-text-base/45 uppercase tracking-widest mt-1 font-medium">
                IDD médio
              </p>
            </div>

            {/* Texto corrido com hierarquia de tamanho */}
            <p className="text-sm text-text-base/65 leading-relaxed">
              <span className="text-xl font-mono font-bold text-critico tabular-nums">
                {estado.pct_vulneravel.toFixed(1)}%
              </span>{' '}
              em situação vulnerável
              {' · '}
              <span className="text-lg font-mono font-semibold text-vulneravel tabular-nums">
                {estado.pct_sem_internet_medio.toFixed(1)}%
              </span>{' '}
              sem internet
            </p>

            {/* Nível predominante — só texto, sem badge colorido */}
            <p className="text-xs text-text-base/35 uppercase tracking-wider">
              {NIVEL_LABELS[estado.nivel_predominante as keyof typeof NIVEL_LABELS] ?? estado.nivel_predominante}
            </p>

            <Link
              href={`/estados/${estado.uf.toLowerCase()}`}
              className="w-full flex justify-center items-center gap-2 py-3 bg-surface hover:bg-surface-hover border border-accent/30 rounded-lg text-accent font-semibold transition-all hover:shadow-glow group text-sm"
            >
              Ver todos os municípios
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="group-hover:translate-x-1 transition-transform"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        ) : (
          <div className="min-h-[180px] lg:min-h-[400px] flex flex-col items-center justify-center text-center gap-3 text-text-base/25 px-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
            <p className="text-sm font-medium">Selecione um estado</p>
          </div>
        )}
      </div>
    </div>
  )
}
