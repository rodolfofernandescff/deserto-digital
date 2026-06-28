'use client'

import { useState } from 'react'
import { MapaBrasil } from './MapaBrasil'
import { MapaLegenda } from './MapaLegenda'
import Link from 'next/link'
import { NIVEL_COLORS, NIVEL_LABELS } from '@/lib/constants'
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
    <div className="relative w-full flex flex-col lg:flex-row gap-4 sm:gap-6">
      <div className="flex-1 min-w-0 relative">
        <MapaBrasil
          estadosData={estadosData}
          estadoSelecionado={selectedUF}
          onEstadoClick={handleEstadoClick}
        />
        <MapaLegenda />
      </div>

      {/* Painel lateral — visível no mobile quando um estado é selecionado */}
      <div
        className={`w-full lg:w-80 shrink-0 flex flex-col transition-all duration-300 ease-in-out ${
          selectedUF
            ? 'opacity-100 translate-y-0'
            : 'hidden lg:flex opacity-50'
        }`}
      >
        {estado ? (
          <div className="card flex flex-col gap-5 sm:gap-6 animate-fade-in relative overflow-hidden">
            <button
              onClick={() => setSelectedUF(null)}
              className="absolute top-4 right-4 text-text-base/40 hover:text-text-base"
              aria-label="Fechar painel"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
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

            <div>
              <h3 className="text-xs sm:text-sm text-text-base/60 uppercase tracking-widest font-semibold mb-1">
                Estado selecionado
              </h3>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-text-base">{estadoNome}</h2>
              <p className="text-sm text-text-base/50 font-mono mt-1">{estado.uf}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-lg bg-background/40 border border-border/40 p-3">
                <span className="text-xs text-text-base/60 block mb-1">IDD médio</span>
                <div className="text-2xl sm:text-3xl font-mono font-bold text-accent">
                  {estado.idd_medio.toFixed(1)}
                </div>
              </div>
              <div className="rounded-lg bg-background/40 border border-border/40 p-3">
                <span className="text-xs text-text-base/60 block mb-1">Sem internet</span>
                <div className="text-2xl sm:text-3xl font-mono font-bold text-vulneravel">
                  {estado.pct_sem_internet_medio.toFixed(1)}%
                </div>
              </div>
              <div className="rounded-lg bg-background/40 border border-border/40 p-3">
                <span className="text-xs text-text-base/60 block mb-1">Vulneráveis</span>
                <div className="text-2xl sm:text-3xl font-mono font-bold text-critico">
                  {estado.pct_vulneravel.toFixed(1)}%
                </div>
              </div>
              <div className="rounded-lg bg-background/40 border border-border/40 p-3">
                <span className="text-xs text-text-base/60 block mb-1">Densidade BL</span>
                <div className="text-2xl sm:text-3xl font-mono font-bold text-text-base">
                  {estado.densidade_media.toFixed(0)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm text-text-base/70">Nível predominante</span>
              <div
                className="badge w-fit"
                style={{
                  backgroundColor:
                    NIVEL_COLORS[estado.nivel_predominante] || '#999',
                  color: '#fff',
                }}
              >
                {NIVEL_LABELS[estado.nivel_predominante] || estado.nivel_predominante}
              </div>
            </div>

            <div className="pt-2">
              <Link
                href={`/estados/${estado.uf.toLowerCase()}`}
                className="w-full flex justify-center items-center gap-2 py-3 bg-surface hover:bg-surface-hover border border-accent/30 rounded-lg text-accent font-semibold transition-all hover:shadow-glow group"
              >
                Ver todos os municípios
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
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
          </div>
        ) : (
          <div className="card min-h-[200px] lg:min-h-[420px] flex flex-col items-center justify-center text-center gap-4 text-text-base/40 border-dashed px-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
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
            <p className="text-sm font-medium max-w-[220px]">
              Toque em um estado no mapa para ver o resumo de exclusão digital.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
