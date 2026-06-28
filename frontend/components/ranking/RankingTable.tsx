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
        <svg className="w-10 h-10 mx-auto mb-4 text-text-base/20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
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
