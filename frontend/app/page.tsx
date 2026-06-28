/**
 * Homepage — Mapa interativo do Brasil
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { api } from '@/lib/api'
import { HomeMapSection } from '@/components/mapa/HomeMapSection'

export const metadata: Metadata = {
  title: 'Mapa da Exclusão Digital no Brasil',
  description:
    'Visualize os desertos digitais do Brasil em um mapa interativo. ' +
    'Descubra quais municípios estão em situação crítica de conectividade.',
}

export default async function HomePage() {
  const [stats, estados] = await Promise.all([
    api.getStats().catch(() => null),
    api.getEstados().catch(() => []),
  ])

  const criticos = stats?.distribuicao_niveis?.CRITICO ?? 0
  const vulneraveis = stats?.distribuicao_niveis?.VULNERAVEL ?? 0
  const emergentes = stats?.distribuicao_niveis?.EMERGENTE ?? 0
  const semFibra = stats?.municipios_sem_backhaul ?? 0
  const total = stats?.total_municipios ?? 0
  const pctDesertos = stats?.percentual_desertos ?? 0

  return (
    <div className="container-app py-6 sm:py-8 space-y-10 sm:space-y-16 animate-fade-in pb-16 sm:pb-20">
      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section className="text-center space-y-4 sm:space-y-6 py-8 sm:py-12 md:py-16 relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-background to-background" />
        <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight px-2">
          Brasil em <span className="text-gradient">silêncio digital</span>
        </h1>
        <p className="text-base sm:text-xl lg:text-2xl text-text-base/70 max-w-3xl mx-auto font-light px-4">
          Descubra onde a internet ainda não chegou
        </p>

        {stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-6 sm:pt-10 max-w-4xl mx-auto px-2">
            <div className="flex flex-col items-center rounded-xl bg-surface/40 border border-border/40 p-4 sm:p-5">
              <div className="text-3xl sm:text-5xl font-mono font-extrabold text-critico">
                {criticos + vulneraveis}
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-text-base/60 uppercase tracking-widest mt-2 text-center">
                municípios vulneráveis
              </div>
            </div>
            <div className="flex flex-col items-center rounded-xl bg-surface/40 border border-border/40 p-4 sm:p-5">
              <div className="text-3xl sm:text-5xl font-mono font-extrabold text-emergente">
                {emergentes}
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-text-base/60 uppercase tracking-widest mt-2 text-center">
                em risco emergente
              </div>
            </div>
            <div className="flex flex-col items-center rounded-xl bg-surface/40 border border-border/40 p-4 sm:p-5">
              <div className="text-3xl sm:text-5xl font-mono font-extrabold text-text-base">
                {semFibra.toLocaleString('pt-BR')}
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-text-base/60 uppercase tracking-widest mt-2 text-center">
                sem fibra óptica
              </div>
            </div>
            <div className="flex flex-col items-center rounded-xl bg-surface/40 border border-border/40 p-4 sm:p-5">
              <div className="text-3xl sm:text-5xl font-mono font-extrabold text-vulneravel">
                {pctDesertos.toFixed(1)}%
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-text-base/60 uppercase tracking-widest mt-2 text-center">
                do território
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-base/50 pt-6">
            Inicie o backend em <code className="text-accent">127.0.0.1:8000</code> para carregar os dados.
          </p>
        )}

        {stats && total > 0 && (
          <p className="text-xs sm:text-sm text-text-base/45 max-w-2xl mx-auto px-4">
            {total.toLocaleString('pt-BR')} municípios analisados com dados ANATEL ({stats.mes_referencia}) e IBGE.
          </p>
        )}
      </section>

      {/* ── Mapa Interativo ───────────────────────────────────────────── */}
      <section aria-label="Mapa do Brasil" className="w-full">
        <HomeMapSection estadosData={estados} />
      </section>

      {/* ── CTA — Links de navegação ──────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row gap-4 justify-center py-4 sm:py-8 px-2">
        <Link
          href="/ranking"
          className="px-6 sm:px-8 py-3 sm:py-4 bg-accent text-background font-bold rounded-lg hover:bg-accent/90 transition-all text-center shadow-glow"
        >
          Ver ranking completo →
        </Link>
      </section>

      {/* ── Explicação Section ────────────────────────────────────────── */}
      <section className="space-y-6 sm:space-y-8 max-w-5xl mx-auto pt-6 sm:pt-10 px-2">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold">O que é o Índice de Deserto Digital?</h2>
          <p className="text-sm sm:text-base text-text-base/60">
            Quatro fatores que medem a verdadeira conectividade de uma região.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="card space-y-3 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-accent">📡</div>
            <h3 className="font-bold">Infraestrutura</h3>
            <p className="text-sm text-text-base/70">Densidade de acessos de banda larga fixa por domicílio.</p>
          </div>
          <div className="card space-y-3 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-critico">🚫</div>
            <h3 className="font-bold">Exclusão</h3>
            <p className="text-sm text-text-base/70">Percentual de domicílios que não utilizam a internet.</p>
          </div>
          <div className="card space-y-3 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-emergente">💰</div>
            <h3 className="font-bold">Renda</h3>
            <p className="text-sm text-text-base/70">Renda per capita, como proxy da capacidade de pagamento.</p>
          </div>
          <div className="card space-y-3 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-conectado">⚡</div>
            <h3 className="font-bold">Backhaul</h3>
            <p className="text-sm text-text-base/70">Presença de rede de transporte de fibra óptica.</p>
          </div>
        </div>

        <div className="text-center pt-4 sm:pt-6">
          <Link href="/sobre" className="link font-medium text-base sm:text-lg">
            Entenda a metodologia completa →
          </Link>
        </div>
      </section>
    </div>
  )
}
