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
  const total = stats?.total_municipios ?? 0
  const pctDesertos = stats?.percentual_desertos ?? 0

  return (
    <div className="container-app animate-fade-in pb-16 sm:pb-20">

      {/* ── Hero + Mapa — tudo acima do fold ─────────────────────────── */}
      <section className="pt-8 sm:pt-10 pb-6 sm:pb-8 relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-background to-background" />

        {/* Heading — compacto para caber com o mapa */}
        <div className="text-center mb-8 sm:mb-10 px-2">
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            Brasil em <span className="text-gradient">silêncio digital</span>
          </h1>
          <p className="text-base sm:text-xl text-text-base/70 max-w-2xl mx-auto font-light mt-3 sm:mt-4">
            Descubra onde a internet ainda não chegou
          </p>
        </div>

        {/* Layout principal: stats à esquerda, mapa à direita */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">

          {/* Stats panel — full width no mobile, coluna fixa no desktop */}
          <div className="w-full lg:w-52 xl:w-60 shrink-0 px-1 lg:px-0">
            {stats ? (
              <div className="space-y-5 lg:sticky lg:top-24">

                {/* Número principal */}
                <div>
                  <div className="text-[3.5rem] sm:text-[4.5rem] lg:text-[3rem] xl:text-[3.5rem] font-mono font-black text-critico leading-none tabular-nums">
                    {pctDesertos.toFixed(1)}%
                  </div>
                  <p className="text-sm text-text-base/55 font-light mt-2 leading-snug">
                    do território nacional<br className="hidden lg:block" /> em situação vulnerável
                  </p>
                </div>

                {/* Dados secundários */}
                <div className="flex lg:flex-col gap-6 lg:gap-3 pt-4 border-t border-border/30">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl lg:text-2xl font-mono font-bold text-text-base tabular-nums">
                      {(criticos + vulneraveis).toLocaleString('pt-BR')}
                    </span>
                    <span className="text-xs text-text-base/50 leading-tight">
                      críticos ou<br />vulneráveis
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl lg:text-xl font-mono font-semibold text-emergente tabular-nums">
                      {emergentes.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-xs text-text-base/50">em risco emergente</span>
                  </div>
                </div>

                {/* CTA inline */}
                <Link
                  href="/ranking"
                  className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors font-medium pt-1"
                >
                  Ver ranking completo
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

              </div>
            ) : (
              <p className="text-sm text-text-base/50">
                Dados temporariamente indisponíveis.
              </p>
            )}
          </div>

          {/* Mapa — ocupa o espaço restante */}
          <div className="flex-1 min-w-0 w-full" aria-label="Mapa do Brasil">
            <HomeMapSection estadosData={estados} />
          </div>
        </div>

        {stats && total > 0 && (
          <p className="text-xs text-text-base/30 mt-5 text-right px-1">
            Censo 2022 (IBGE) · Ref. {stats.mes_referencia ?? ''}
          </p>
        )}
      </section>

      {/* ── Explicação Section ────────────────────────────────────────── */}
      <section className="space-y-6 sm:space-y-8 max-w-5xl mx-auto py-12 sm:py-16 px-2 border-t border-border/20">
        <div className="text-center space-y-3">
          <h2 className="font-display text-2xl sm:text-3xl font-bold">O que é o Índice de Deserto Digital?</h2>
          <p className="text-sm sm:text-base text-text-base/60">
            Quatro fatores que medem a verdadeira conectividade de uma região.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="card space-y-3 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z" />
              </svg>
            </div>
            <h3 className="font-semibold">Infraestrutura</h3>
            <p className="text-sm text-text-base/70">Densidade de acessos de banda larga fixa por domicílio.</p>
          </div>
          <div className="card space-y-3 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-lg bg-critico/10 flex items-center justify-center text-critico">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h3 className="font-semibold">Exclusão</h3>
            <p className="text-sm text-text-base/70">Percentual de domicílios que não utilizam a internet.</p>
          </div>
          <div className="card space-y-3 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-lg bg-emergente/10 flex items-center justify-center text-emergente">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 6v12m-3-2.818.879.659 1.171-.196.43-.562.082-.819-.95-.95-.562-.082-.43.562-.879-.659M3 12c0 4.97 4.03 9 9 9s9-4.03 9-9-4.03-9-9-9-9 4.03-9 9Z" />
              </svg>
            </div>
            <h3 className="font-semibold">Renda</h3>
            <p className="text-sm text-text-base/70">Renda per capita, como proxy da capacidade de pagamento.</p>
          </div>
          <div className="card space-y-3 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-lg bg-conectado/10 flex items-center justify-center text-conectado">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
            </div>
            <h3 className="font-semibold">Backhaul</h3>
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
