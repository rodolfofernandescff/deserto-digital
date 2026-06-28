/**
 * RankingContent — Client Component wrapper para a página de ranking
 *
 * Gerencia estado dos filtros e paginação, usando hooks SWR para buscar dados.
 * Encapsula RankingFilters + RankingTable + Paginação.
 */

'use client'

import { useState } from 'react'
import { useMunicipios } from '@/hooks/useMunicipios'
import { RankingFilters } from '@/components/ranking/RankingFilters'
import { RankingTable } from '@/components/ranking/RankingTable'

interface RankingContentProps {
  initialUF?: string | null
  initialNivel?: string | null
}

export function RankingContent({ initialUF = null, initialNivel = null }: RankingContentProps) {
  const [uf, setUF] = useState<string | null>(initialUF)
  const [nivel, setNivel] = useState<string | null>(initialNivel)
  const [page, setPage] = useState(1)

  const { municipios, total, hasNext, isLoading } = useMunicipios({
    uf: uf ?? undefined,
    nivel: nivel ?? undefined,
    page,
    pageSize: 25,
  })

  // Reset page when filters change
  function handleUFChange(newUF: string | null) {
    setUF(newUF)
    setPage(1)
  }

  function handleNivelChange(newNivel: string | null) {
    setNivel(newNivel)
    setPage(1)
  }

  const startPosition = (page - 1) * 25 + 1
  const totalPages = Math.ceil(total / 25)

  return (
    <>
      {/* Filtros */}
      <section aria-label="Filtros do ranking">
        <RankingFilters
          selectedUF={uf}
          selectedNivel={nivel}
          onUFChange={handleUFChange}
          onNivelChange={handleNivelChange}
        />
      </section>

      {/* Resumo de resultados */}
      <div className="flex items-center justify-between text-sm text-text-base/50">
        <p>
          {isLoading ? (
            <span className="skeleton inline-block h-4 w-48 rounded" />
          ) : (
            <>
              Mostrando <span className="font-mono text-text-base/70">{municipios.length}</span> de{' '}
              <span className="font-mono text-text-base/70">{total.toLocaleString('pt-BR')}</span> municípios
            </>
          )}
        </p>
        {totalPages > 1 && !isLoading && (
          <p className="font-mono text-xs">
            Página {page} de {totalPages}
          </p>
        )}
      </div>

      {/* Tabela */}
      <section aria-label="Tabela de ranking">
        <RankingTable
          municipios={municipios}
          isLoading={isLoading}
          startPosition={startPosition}
        />
      </section>

      {/* Paginação */}
      {totalPages > 1 && (
        <nav aria-label="Paginação" className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium
                       bg-surface border border-border text-text-base/70
                       hover:bg-accent/10 hover:text-accent hover:border-accent/30
                       disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-surface
                       disabled:hover:text-text-base/70 disabled:hover:border-border
                       transition-all duration-200 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Anterior
          </button>

          {/* Page indicators */}
          <div className="hidden sm:flex items-center gap-1">
            {generatePageNumbers(page, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-text-base/30">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`w-9 h-9 rounded-lg text-sm font-mono transition-all duration-200 cursor-pointer ${
                    p === page
                      ? 'bg-accent text-white font-semibold shadow-glow'
                      : 'text-text-base/50 hover:bg-surface hover:text-text-base'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNext || isLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium
                       bg-surface border border-border text-text-base/70
                       hover:bg-accent/10 hover:text-accent hover:border-accent/30
                       disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-surface
                       disabled:hover:text-text-base/70 disabled:hover:border-border
                       transition-all duration-200 cursor-pointer"
          >
            Próxima
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </nav>
      )}
    </>
  )
}

// Helper: generate page numbers with ellipsis
function generatePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | string)[] = [1]

  if (current > 3) pages.push('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('...')

  pages.push(total)

  return pages
}
