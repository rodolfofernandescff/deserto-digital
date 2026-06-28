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

  const total = stats?.total_municipios ?? 0

  return (
    <div className="container-app animate-fade-in">

      {/* ── Hero: heading + mapa em tela cheia ──────────────────────────── */}
      <section className="flex flex-col pt-5 sm:pt-7 pb-2 relative lg:overflow-hidden lg:h-[calc(100svh-4rem)]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/8 via-background to-background pointer-events-none" />

        {/* Heading — compacto, centralizado */}
        <div className="shrink-0 text-center mb-3 sm:mb-5 px-2">
          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            Brasil em <span className="text-gradient">silêncio digital</span>
          </h1>
          <p className="text-sm sm:text-lg text-text-base/60 max-w-xl mx-auto font-light mt-2">
            Descubra onde a internet ainda não chegou
          </p>
        </div>

        {/* Stats strip — mobile/tablet only (desktop usa overlay no mapa) */}
        {stats && (
          <div className="lg:hidden shrink-0 flex items-center justify-center gap-5 sm:gap-8 mb-3 px-4">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-mono font-black text-critico leading-none tabular-nums">
                {stats.percentual_desertos.toFixed(1)}%
              </div>
              <p className="text-[10px] text-text-base/50 mt-0.5">vulneráveis</p>
            </div>
            <div className="w-px h-8 bg-border/40" />
            <div className="text-center">
              <div className="text-lg sm:text-xl font-mono font-bold text-text-base tabular-nums">
                {(
                  (stats.distribuicao_niveis?.CRITICO ?? 0) +
                  (stats.distribuicao_niveis?.VULNERAVEL ?? 0)
                ).toLocaleString('pt-BR')}
              </div>
              <p className="text-[10px] text-text-base/50 mt-0.5">críticos ou vuln.</p>
            </div>
            <div className="w-px h-8 bg-border/40" />
            <Link
              href="/ranking"
              className="text-xs text-accent hover:text-accent/80 transition-colors font-semibold"
            >
              Ranking →
            </Link>
          </div>
        )}

        {/* Mapa — flex-1 preenche todo espaço restante */}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col" aria-label="Mapa do Brasil">
          <HomeMapSection estadosData={estados} stats={stats} />
        </div>

        {/* Atribuição */}
        {stats && total > 0 && (
          <p className="shrink-0 text-[10px] text-text-base/25 mt-1.5 text-right px-1">
            Censo 2022 (IBGE) · Ref. {stats.mes_referencia ?? ''}
          </p>
        )}
      </section>

      {/* ── Metodologia (scroll) ──────────────────────────────────────── */}
      <section className="space-y-6 sm:space-y-8 max-w-5xl mx-auto py-12 sm:py-16 px-2 border-t border-border/20 pb-16 sm:pb-20">
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
