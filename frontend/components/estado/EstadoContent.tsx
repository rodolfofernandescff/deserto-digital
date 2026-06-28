/**
 * EstadoContent — Client wrapper para a página de detalhe do estado
 *
 * Busca dados do estado via API e renderiza:
 * - 4 StatCards com resumo
 * - Lista dos 5 piores municípios
 * - Link para ranking filtrado por UF
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { UFS } from '@/lib/constants'
import type { EstadoResumo, MunicipioResumo } from '@/lib/types'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { RankingTable } from '@/components/ranking/RankingTable'
import {
  formatNumber,
  formatPercent,
  formatScore,
  calcularPercentualDeserto,
} from '@/lib/utils'

interface EstadoContentProps {
  uf: string
}

export function EstadoContent({ uf }: EstadoContentProps) {
  const [estado, setEstado] = useState<EstadoResumo | null>(null)
  const [piores, setPiores] = useState<MunicipioResumo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  const ufInfo = UFS.find((u) => u.sigla === uf)
  const nomeEstado = ufInfo?.nome ?? uf

  useEffect(() => {
    setIsLoading(true)
    setError(false)

    Promise.all([
      api.getEstado(uf),
      api.getRanking({ uf, limit: 5 }),
    ])
      .then(([estadoData, rankingData]) => {
        setEstado(estadoData)
        setPiores(rankingData)
      })
      .catch(() => setError(true))
      .finally(() => setIsLoading(false))
  }, [uf])

  if (isLoading) {
    return <EstadoSkeleton nomeEstado={nomeEstado} />
  }

  if (error || !estado) {
    return (
      <div className="text-center py-20 space-y-4">
        <span className="text-5xl block" aria-hidden="true">🗺️</span>
        <h2 className="text-xl font-bold text-text-base/80">Estado não encontrado</h2>
        <p className="text-text-base/50">
          Não foi possível carregar os dados de <strong>{uf}</strong>.
        </p>
        <Link
          href="/ranking"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-white
                     font-medium hover:bg-accent/80 transition-colors duration-200 mt-4"
        >
          ← Voltar ao ranking
        </Link>
      </div>
    )
  }

  const percentDeserto = calcularPercentualDeserto(
    estado.distribuicao_niveis,
    estado.total_municipios,
  )

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <nav className="flex items-center gap-2 text-sm text-text-base/40">
          <Link href="/" className="hover:text-accent transition-colors">Início</Link>
          <span>›</span>
          <span className="text-text-base/70">{nomeEstado}</span>
        </nav>

        <h1 className="section-title">
          {nomeEstado}{' '}
          <span className="text-text-base/40 text-xl font-normal">({uf})</span>
        </h1>
        <p className="text-text-base/60 text-lg">
          Panorama da conectividade e exclusão digital nos municípios deste estado.
        </p>
      </div>

      {/* ── 4 StatCards ─────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total de Municípios"
          value={formatNumber(estado.total_municipios)}
          icon="🏘️"
        />
        <StatCard
          label="Em Deserto Digital"
          value={formatPercent(percentDeserto)}
          sublabel={`${formatNumber((estado.distribuicao_niveis.CRITICO ?? 0) + (estado.distribuicao_niveis.VULNERAVEL ?? 0))} municípios`}
          color="#E53E3E"
          icon="⚠️"
        />
        <StatCard
          label="Pior Município"
          value={formatScore(estado.pior_municipio.idd_score)}
          sublabel={estado.pior_municipio.nome}
          color="#E53E3E"
          icon="📍"
        />
        <StatCard
          label="IDD Médio"
          value={formatScore(estado.idd_medio)}
          icon="📊"
        />
      </section>

      {/* ── Distribuição por nível ─────────────────────────────────── */}
      <section className="card-static space-y-4">
        <h2 className="text-sm font-semibold text-text-base/70 uppercase tracking-wider">
          Distribuição por Nível
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([
            { key: 'CRITICO', emoji: '⚠️', label: 'Crítico', color: '#E53E3E' },
            { key: 'VULNERAVEL', emoji: '🟠', label: 'Vulnerável', color: '#ED8936' },
            { key: 'EMERGENTE', emoji: '🟡', label: 'Emergente', color: '#ECC94B' },
            { key: 'CONECTADO', emoji: '🟢', label: 'Conectado', color: '#48BB78' },
          ] as const).map(({ key, emoji, label, color }) => {
            const count = estado.distribuicao_niveis[key] ?? 0
            const pct = estado.total_municipios > 0
              ? (count / estado.total_municipios) * 100
              : 0

            return (
              <div key={key} className="text-center p-4 rounded-lg bg-background/50 border border-border/50">
                <span className="text-2xl block mb-1" aria-hidden="true">{emoji}</span>
                <p className="font-mono text-2xl font-bold" style={{ color }}>
                  {count}
                </p>
                <p className="text-xs text-text-base/50 font-medium uppercase tracking-wider mt-1">
                  {label}
                </p>
                <p className="text-xs text-text-base/30 font-mono">
                  {formatPercent(pct, 0)}
                </p>
              </div>
            )
          })}
        </div>

        {/* Bar visualization */}
        <div className="h-3 rounded-full overflow-hidden flex">
          {([
            { key: 'CRITICO', color: '#E53E3E' },
            { key: 'VULNERAVEL', color: '#ED8936' },
            { key: 'EMERGENTE', color: '#ECC94B' },
            { key: 'CONECTADO', color: '#48BB78' },
          ] as const).map(({ key, color }) => {
            const count = estado.distribuicao_niveis[key] ?? 0
            const pct = estado.total_municipios > 0
              ? (count / estado.total_municipios) * 100
              : 0
            return (
              <div
                key={key}
                style={{ width: `${pct}%`, backgroundColor: color }}
                className="transition-all duration-700"
                title={`${key}: ${count} municípios (${pct.toFixed(1)}%)`}
              />
            )
          })}
        </div>
      </section>

      {/* ── 5 piores municípios ────────────────────────────────────── */}
      {piores.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-text-base/70 uppercase tracking-wider">
            Municípios mais críticos
          </h2>
          <RankingTable municipios={piores} startPosition={1} />
        </section>
      )}

      {/* ── Destaques: pior e melhor ───────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <MunicipioDestaque
          label="Mais crítico"
          municipio={estado.pior_municipio}
          emoji="🔴"
        />
        <MunicipioDestaque
          label="Mais conectado"
          municipio={estado.melhor_municipio}
          emoji="🟢"
        />
      </section>

      {/* ── Link para ranking filtrado ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href={`/ranking`}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium
                     bg-accent text-white hover:bg-accent/80 transition-colors duration-200"
        >
          📊 Ver todos os municípios de {uf} no ranking
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium
                     bg-surface border border-border text-text-base/70
                     hover:bg-accent/10 hover:text-accent hover:border-accent/30
                     transition-all duration-200"
        >
          ← Voltar ao mapa
        </Link>
      </div>
    </div>
  )
}

// ── Componente auxiliar: destaque de município ──────────────────────────────

function MunicipioDestaque({
  label,
  municipio,
  emoji,
}: {
  label: string
  municipio: MunicipioResumo
  emoji: string
}) {
  return (
    <Link
      href={`/municipio/${municipio.codigo_ibge}`}
      className="card group block"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden="true">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-text-base/50 uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className="font-bold text-text-base group-hover:text-accent transition-colors truncate">
            {municipio.nome}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Badge nivel={municipio.nivel_deserto} size="sm" />
            <span className="font-mono text-sm text-text-base/50">
              IDD {formatScore(municipio.idd_score)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Skeleton ────────────────────────────────────────────────────────────────

function EstadoSkeleton({ nomeEstado }: { nomeEstado: string }) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="skeleton h-4 w-32 rounded" />
        <div className="skeleton h-9 w-48 rounded" />
        <div className="skeleton h-5 w-80 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card space-y-3">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-8 w-24 rounded" />
            <div className="skeleton h-3 w-28 rounded" />
          </div>
        ))}
      </div>
      <div className="card-static space-y-4">
        <div className="skeleton h-4 w-40 rounded" />
        <div className="skeleton h-3 w-full rounded-full" />
      </div>
    </div>
  )
}
