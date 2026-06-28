/**
 * /ranking — Tabela dos municípios mais críticos
 *
 * Server Component que renderiza:
 * - Título e subtítulo
 * - RankingContent (Client) para filtros + tabela + paginação
 */

import type { Metadata } from 'next'
import { RankingContent } from '@/components/ranking/RankingContent'

export const metadata: Metadata = {
  title: 'Ranking dos Desertos Digitais',
  description:
    'Ranking completo dos municípios brasileiros por nível de exclusão digital. ' +
    'Filtre por estado e nível para encontrar as cidades mais críticas.',
}

export default function RankingPage() {
  return (
    <div className="container-app py-8 space-y-6 animate-fade-in">
      {/* ── Header da página ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <h1 className="section-title">
          Municípios em{' '}
          <span className="text-gradient">Deserto Digital</span>
        </h1>
        <p className="text-text-base/60 max-w-2xl text-lg">
          Ranking dos municípios brasileiros ordenados pelo Índice de Deserto Digital (IDD).
          Quanto maior o score, pior a situação de conectividade e inclusão digital.
        </p>
      </div>

      {/* ── Conteúdo interativo (Client Component) ────────────────────── */}
      <RankingContent />
    </div>
  )
}
