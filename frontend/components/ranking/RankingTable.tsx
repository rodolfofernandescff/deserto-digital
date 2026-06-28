/**
 * RankingTable — Tabela responsiva de municípios no ranking
 *
 * Exibe os municípios em uma tabela com:
 * - Posição, Nome/UF, IDD Score com barra de progresso inline, Nível (Badge),
 *   Cobertura (densidade de banda larga), % Sem Internet
 * - Linha clicável que navega para /municipio/{codigo_ibge}
 * - Skeleton loading quando isLoading=true
 * - Responsivo: esconde colunas secundárias em mobile
 *
 * Props:
 * - municipios: MunicipioResumo[] — lista de municípios (já filtrada/paginada)
 * - isLoading?: boolean — exibe skeleton enquanto carrega
 * - startPosition?: number — posição inicial para numeração (default: 1)
 */

'use client'

import { useRouter } from 'next/navigation'
import type { MunicipioResumo } from '@/lib/types'
import { formatNumber, formatPercent, formatScore, nivelColor } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'

interface RankingTableProps {
  municipios?: MunicipioResumo[]
  isLoading?: boolean
  startPosition?: number
}

export function RankingTable({ municipios = [], isLoading, startPosition = 1 }: RankingTableProps) {
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface/80 border-b border-border">
            <tr>
              <th className="px-4 py-3 font-semibold text-text-base/60 w-12">#</th>
              <th className="px-4 py-3 font-semibold text-text-base/60">Município / UF</th>
              <th className="px-4 py-3 font-semibold text-text-base/60 w-32">IDD</th>
              <th className="px-4 py-3 font-semibold text-text-base/60 w-32">Nível</th>
              <th className="px-4 py-3 font-semibold text-text-base/60 w-28 text-right hidden md:table-cell">Cobertura</th>
              <th className="px-4 py-3 font-semibold text-text-base/60 w-28 text-right hidden lg:table-cell">Sem Internet</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="px-4 py-3"><div className="skeleton h-4 w-6 rounded" /></td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <div className="skeleton h-4 w-32 rounded" />
                    <div className="skeleton h-3 w-16 rounded" />
                  </div>
                </td>
                <td className="px-4 py-3"><div className="skeleton h-4 w-20 rounded" /></td>
                <td className="px-4 py-3"><div className="skeleton h-6 w-24 rounded-full" /></td>
                <td className="px-4 py-3 hidden md:table-cell"><div className="skeleton h-4 w-16 rounded ml-auto" /></td>
                <td className="px-4 py-3 hidden lg:table-cell"><div className="skeleton h-4 w-16 rounded ml-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (municipios.length === 0) {
    return (
      <div className="card-static text-center py-16">
        <span className="text-4xl mb-4 block" aria-hidden="true">🔍</span>
        <p className="text-text-base/60 text-lg font-medium">Nenhum município encontrado</p>
        <p className="text-text-base/40 text-sm mt-1">Tente ajustar os filtros para ver resultados.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="w-full text-sm text-left">
        <thead className="bg-surface/80 border-b border-border">
          <tr>
            <th className="px-4 py-3 font-semibold text-text-base/60 w-12">#</th>
            <th className="px-4 py-3 font-semibold text-text-base/60">Município / UF</th>
            <th className="px-4 py-3 font-semibold text-text-base/60 w-36">IDD</th>
            <th className="px-4 py-3 font-semibold text-text-base/60 w-32">Nível</th>
            <th className="px-4 py-3 font-semibold text-text-base/60 w-28 text-right hidden md:table-cell">Cobertura</th>
            <th className="px-4 py-3 font-semibold text-text-base/60 w-28 text-right hidden lg:table-cell">Sem Internet</th>
          </tr>
        </thead>
        <tbody>
          {municipios.map((m, i) => {
            const color = nivelColor(m.nivel_deserto)
            const iddValue = m.idd_score ?? 0
            const barWidth = Math.min(Math.max(iddValue, 0), 100)

            return (
              <tr
                key={m.codigo_ibge}
                onClick={() => router.push(`/municipio/${m.codigo_ibge}`)}
                className="border-b border-border/30 cursor-pointer
                           hover:bg-accent/5 transition-colors duration-200 group"
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    router.push(`/municipio/${m.codigo_ibge}`)
                  }
                }}
              >
                {/* Posição */}
                <td className="px-4 py-3 text-text-base/40 font-mono text-xs tabular-nums">
                  {startPosition + i}
                </td>

                {/* Município / UF */}
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-text-base group-hover:text-accent transition-colors duration-200">
                      {m.nome}
                    </span>
                    <span className="text-xs text-text-base/40">{m.uf} · {m.regiao}</span>
                  </div>
                </td>

                {/* IDD Score com barra inline */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-sm tabular-nums w-10" style={{ color }}>
                      {formatScore(m.idd_score)}
                    </span>
                    <div className="flex-1 h-1.5 bg-border/40 rounded-full overflow-hidden max-w-[60px]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: color,
                          boxShadow: `0 0 4px ${color}44`,
                        }}
                      />
                    </div>
                  </div>
                </td>

                {/* Nível */}
                <td className="px-4 py-3">
                  <Badge nivel={m.nivel_deserto} size="sm" />
                </td>

                {/* Cobertura (Densidade de banda larga) */}
                <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-text-base/60 hidden md:table-cell">
                  {formatPercent(m.densidade_banda_larga)}
                </td>

                {/* % Sem Internet */}
                <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-text-base/60 hidden lg:table-cell">
                  {formatPercent(m.percentual_sem_internet)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
