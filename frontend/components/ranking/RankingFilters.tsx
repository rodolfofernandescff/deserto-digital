/**
 * RankingFilters — Filtros para a tabela de ranking
 *
 * Filtros interativos:
 * - Select de UF (27 UFs agrupadas por região + "Todos os estados")
 * - Select de nível (4 níveis + "Todos os níveis")
 * - Botão "Limpar filtros" quando algum filtro ativo
 *
 * Props:
 * - selectedUF: string | null
 * - selectedNivel: string | null
 * - onUFChange: (uf: string | null) => void
 * - onNivelChange: (nivel: string | null) => void
 */

'use client'

import { UFS, NIVEL_LABELS, REGIOES_NOMES } from '@/lib/constants'
import type { NivelDeserto } from '@/lib/types'

interface RankingFiltersProps {
  selectedUF?: string | null
  selectedNivel?: string | null
  onUFChange?: (uf: string | null) => void
  onNivelChange?: (nivel: string | null) => void
}

export function RankingFilters({
  selectedUF,
  selectedNivel,
  onUFChange,
  onNivelChange,
}: RankingFiltersProps) {
  const hasActiveFilters = !!selectedUF || !!selectedNivel

  function clearFilters() {
    onUFChange?.(null)
    onNivelChange?.(null)
  }

  // Agrupar UFs por região
  const ufsByRegiao = REGIOES_NOMES.map((regiao) => ({
    regiao,
    ufs: UFS.filter((u) => u.regiao === regiao),
  }))

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      {/* Filtro de UF */}
      <div className="relative w-full sm:w-auto">
        <select
          id="filter-uf"
          value={selectedUF ?? ''}
          onChange={(e) => onUFChange?.(e.target.value || null)}
          className="w-full sm:w-56 appearance-none bg-surface border border-border rounded-lg
                     px-4 py-2.5 pr-10 text-text-base text-sm cursor-pointer
                     focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                     transition-colors hover:border-accent/30"
          aria-label="Filtrar por estado"
        >
          <option value="">🗺️ Todos os estados</option>
          {ufsByRegiao.map(({ regiao, ufs }) => (
            <optgroup key={regiao} label={regiao}>
              {ufs.map((u) => (
                <option key={u.sigla} value={u.sigla}>
                  {u.nome} ({u.sigla})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-base/40">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Filtro de nível */}
      <div className="relative w-full sm:w-auto">
        <select
          id="filter-nivel"
          value={selectedNivel ?? ''}
          onChange={(e) => onNivelChange?.(e.target.value || null)}
          className="w-full sm:w-48 appearance-none bg-surface border border-border rounded-lg
                     px-4 py-2.5 pr-10 text-text-base text-sm cursor-pointer
                     focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                     transition-colors hover:border-accent/30"
          aria-label="Filtrar por nível"
        >
          <option value="">📊 Todos os níveis</option>
          {(Object.entries(NIVEL_LABELS) as [NivelDeserto, string][]).map(([key, label]) => {
            const emojis: Record<string, string> = {
              CRITICO: '⚠️',
              VULNERAVEL: '🟠',
              EMERGENTE: '🟡',
              CONECTADO: '🟢',
            }
            return (
              <option key={key} value={key}>
                {emojis[key]} {label}
              </option>
            )
          })}
        </select>
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-base/40">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Botão limpar filtros */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm
                     text-text-base/60 bg-border/30 border border-border
                     hover:bg-critico/10 hover:text-critico hover:border-critico/30
                     transition-all duration-200 cursor-pointer"
          aria-label="Limpar todos os filtros"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Limpar filtros
        </button>
      )}
    </div>
  )
}
