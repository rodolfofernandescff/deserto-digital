/**
 * MunicipioContent — Client wrapper para a página de detalhe do município
 *
 * Renderiza o conteúdo completo do perfil do município usando useMunicipio hook.
 * Inclui IDDGauge, ComponentesBar, StatCards, e seção explicativa.
 */

'use client'

import Link from 'next/link'
import { useMunicipio } from '@/hooks/useMunicipio'
import { IDDGauge } from '@/components/municipio/IDDGauge'
import { ComponentesBar } from '@/components/municipio/ComponentesBar'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import {
  formatNumber,
  formatPercent,
  formatScore,
  formatCurrency,
  formatMesReferencia,
  nivelColor,
  nivelLabel,
} from '@/lib/utils'

interface MunicipioContentProps {
  codigo: string
}

export function MunicipioContent({ codigo }: MunicipioContentProps) {
  const { municipio, isLoading, isError } = useMunicipio(codigo)

  if (isLoading) {
    return <MunicipioSkeleton />
  }

  if (isError || !municipio) {
    return (
      <div className="text-center py-20 space-y-4">
        <span className="text-5xl block" aria-hidden="true">🔍</span>
        <h2 className="text-xl font-bold text-text-base/80">Município não encontrado</h2>
        <p className="text-text-base/50">
          O município com código <span className="font-mono">{codigo}</span> não foi encontrado.
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

  const color = nivelColor(municipio.nivel_deserto)
  const label = nivelLabel(municipio.nivel_deserto)

  // Determine the "what does this mean" text based on nivel
  const significado = getSignificado(municipio.nivel_deserto, municipio.nome)

  return (
    <div className="space-y-8">
      {/* ── Breadcrumb + Header ─────────────────────────────────────── */}
      <div className="space-y-4">
        <nav className="flex items-center gap-2 text-sm text-text-base/40">
          <Link href="/" className="hover:text-accent transition-colors">Início</Link>
          <span>›</span>
          <Link href={`/estados/${municipio.uf.toLowerCase()}`} className="hover:text-accent transition-colors">
            {municipio.uf}
          </Link>
          <span>›</span>
          <span className="text-text-base/70">{municipio.nome}</span>
        </nav>

        <div className="flex flex-wrap items-center gap-4">
          <h1 className="section-title">
            {municipio.nome}
          </h1>
          <Badge nivel={municipio.nivel_deserto} size="md" />
        </div>

        <p className="text-text-base/50">
          {municipio.uf} · {municipio.regiao} · Código IBGE: {municipio.codigo_ibge}
        </p>
      </div>

      {/* ── Score IDD + Componentes ─────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal: Gauge do IDD */}
        <div className="lg:col-span-1 card-static flex flex-col items-center justify-center py-8">
          <IDDGauge
            score={municipio.idd_score}
            nivel={municipio.nivel_deserto}
            size={240}
          />
        </div>

        {/* Coluna lateral: Componentes do IDD */}
        <div className="lg:col-span-2 card-static">
          <ComponentesBar componentes={municipio.componentes_idd} />
        </div>
      </section>

      {/* ── Cards de métricas ──────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="População"
          value={formatNumber(municipio.populacao)}
          sublabel={`${formatNumber(municipio.domicilios_total)} domicílios`}
          icon="👥"
        />
        <StatCard
          label="Sem Internet"
          value={formatPercent(municipio.percentual_sem_internet)}
          sublabel={`${formatNumber(municipio.domicilios_sem_internet)} domicílios`}
          color="#E53E3E"
          icon="🚫"
        />
        <StatCard
          label="Banda Larga"
          value={formatPercent(municipio.densidade_banda_larga)}
          sublabel={`${formatNumber(municipio.acessos_banda_larga)} acessos`}
          color="#1B9AAA"
          icon="📡"
        />
        <StatCard
          label="Renda per capita"
          value={formatCurrency(municipio.renda_per_capita)}
          sublabel={municipio.tem_backhaul ? '✅ Com backhaul' : '❌ Sem backhaul'}
          icon="💰"
        />
      </section>

      {/* ── O que isso significa? ──────────────────────────────────── */}
      <section className="card-static space-y-4">
        <h2 className="text-lg font-bold text-text-base/90 flex items-center gap-2">
          <span aria-hidden="true">💡</span>
          O que isso significa?
        </h2>
        <div className="text-text-base/60 leading-relaxed space-y-3">
          <p>{significado}</p>
          <p>
            O Índice de Deserto Digital (IDD) é composto por 4 dimensões: infraestrutura de
            telecomunicações (peso 40%), exclusão digital domiciliar (30%), renda da
            população (20%) e conectividade de backhaul (10%). Quanto <strong className="text-text-base/80">maior</strong> o
            score, <strong className="text-text-base/80">pior</strong> a situação do município.
          </p>
        </div>
      </section>

      {/* ── Informações complementares ─────────────────────────────── */}
      <section className="card-static text-sm text-text-base/50 space-y-2">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span>
            📅 Dados de referência: {formatMesReferencia(municipio.fonte_anatel_mes)}
          </span>
          <span>
            🔄 Atualizado em: {municipio.atualizado_em
              ? new Intl.DateTimeFormat('pt-BR').format(new Date(municipio.atualizado_em))
              : '—'}
          </span>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <span className={`inline-block w-3 h-3 rounded-full`} style={{ backgroundColor: color }} />
          <span>
            Nível: <strong style={{ color }}>{label}</strong> — Score IDD:{' '}
            <strong className="font-mono">{formatScore(municipio.idd_score)}</strong>
          </span>
        </div>
      </section>

      {/* ── Links de navegação ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/ranking"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium
                     bg-surface border border-border text-text-base/70
                     hover:bg-accent/10 hover:text-accent hover:border-accent/30
                     transition-all duration-200"
        >
          ← Ver ranking completo
        </Link>
        <Link
          href={`/estados/${municipio.uf.toLowerCase()}`}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium
                     bg-accent/10 border border-accent/30 text-accent
                     hover:bg-accent/20 hover:border-accent/50
                     transition-all duration-200"
        >
          📍 Ver estado {municipio.uf}
        </Link>
      </div>
    </div>
  )
}

// ── Skeleton loading ──────────────────────────────────────────────────────────

function MunicipioSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="skeleton h-4 w-48 rounded" />
        <div className="flex items-center gap-4">
          <div className="skeleton h-9 w-64 rounded" />
          <div className="skeleton h-7 w-24 rounded-full" />
        </div>
        <div className="skeleton h-4 w-56 rounded" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-static flex items-center justify-center py-8">
          <div className="skeleton h-36 w-52 rounded-full" />
        </div>
        <div className="lg:col-span-2 card-static space-y-5 py-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton h-4 w-36 rounded" />
              <div className="skeleton h-2.5 w-full rounded-full" />
            </div>
          ))}
        </div>
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
    </div>
  )
}

// ── Helper: texto explicativo por nível ────────────────────────────────────

function getSignificado(nivel: string | null, nome: string): string {
  switch (nivel) {
    case 'CRITICO':
      return `${nome} está em situação crítica de deserto digital. Isso significa que a maioria da população não tem acesso adequado à internet, a infraestrutura de telecomunicações é precária, e a renda local dificulta a aquisição de serviços de conectividade. Moradores deste município enfrentam sérias barreiras para acessar serviços públicos digitais, educação online e oportunidades econômicas.`
    case 'VULNERAVEL':
      return `${nome} está em situação vulnerável. Embora exista alguma infraestrutura de telecomunicações, uma parcela significativa da população ainda não tem acesso à internet. A combinação de baixa cobertura de banda larga e renda limitada mantém muitas famílias excluídas digitalmente.`
    case 'EMERGENTE':
      return `${nome} está em fase emergente de conectividade. O município já conta com infraestrutura razoável, mas ainda há espaço para melhorias. Uma parte da população já consegue acessar internet, porém a cobertura não é universal e há desigualdades internas.`
    case 'CONECTADO':
      return `${nome} apresenta bons indicadores de conectividade digital. A maior parte da população tem acesso à internet, a infraestrutura de telecomunicações é adequada e a cobertura de banda larga atende grande parte dos domicílios.`
    default:
      return `Não há dados suficientes para classificar o nível de deserto digital de ${nome}. Isso pode ocorrer quando os dados do Censo ou da Anatel estão incompletos.`
  }
}
