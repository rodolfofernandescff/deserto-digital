/**
 * /sobre — Explica o Índice de Deserto Digital (IDD)
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { NIVEL_COLORS } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Sobre o Índice de Deserto Digital',
  description:
    'Entenda como o Índice de Deserto Digital (IDD) é calculado e o que cada ' +
    'nível significa para os municípios brasileiros.',
}

export default function SobrePage() {
  return (
    <div className="container-app py-12 space-y-16 animate-fade-in max-w-4xl mx-auto pb-24">
      {/* ── Título principal ──────────────────────────────────────────── */}
      <section className="space-y-6 text-center">
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
          O que é o <span className="text-gradient">Deserto Digital</span>?
        </h1>
        <p className="text-xl text-text-base/80 leading-relaxed max-w-2xl mx-auto font-light">
          No Brasil, mais de 10.000 comunidades têm população real, mas infraestrutura digital precária. O Índice de Deserto Digital (IDD) mede o tamanho desse abismo.
        </p>
      </section>

      {/* ── O Problema e o IDD ───────────────────────────────────────── */}
      <section className="space-y-6 card p-8 border-accent/20 bg-surface/30">
        <h2 className="font-display text-2xl font-bold text-accent">Como um termômetro da exclusão</h2>
        <div className="space-y-4 text-text-base/80 leading-relaxed">
          <p>
            Enquanto os grandes centros urbanos discutem a chegada do 5G e gigabits de fibra óptica, milhares de municípios brasileiros vivem um apagão silencioso. São os chamados "desertos digitais".
          </p>
          <p>
            O <strong>Índice de Deserto Digital (IDD)</strong> é uma métrica desenvolvida para identificar, classificar e dar visibilidade a essas regiões. Ele funciona como um termômetro: de 0 a 100, quanto maior a pontuação, mais isolado digitalmente está o município.
          </p>
          <p>
            Não medimos apenas se o sinal de celular chega na praça da igreja. Nós combinamos quatro fatores vitais para revelar se a população de fato possui capacidade, infraestrutura e renda para fazer parte do século XXI digital.
          </p>
        </div>
      </section>

      {/* ── Os 4 componentes ───────────────────────────────────────── */}
      <section className="space-y-8">
        <h2 className="font-display text-2xl font-bold border-b border-border/50 pb-4">A Metodologia: 4 Componentes</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card space-y-3">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg">Infraestrutura — Peso: 40%</h3>
            <p className="text-text-base/70">Mede a densidade de acessos de banda larga fixa por 100 domicílios. Sem o "cabo" chegando na cidade, a estabilidade e velocidade caem drasticamente.</p>
            <div className="text-xs font-mono text-text-base/50 pt-2">Fonte: Anatel</div>
          </div>

          <div className="card space-y-3">
            <div className="w-12 h-12 rounded-lg bg-critico/10 flex items-center justify-center text-critico mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg">Exclusão Pura — Peso: 30%</h3>
            <p className="text-text-base/70">Percentual de domicílios que declararam não utilizar a internet de forma alguma. O retrato mais direto de quem está fora da rede.</p>
            <div className="text-xs font-mono text-text-base/50 pt-2">Fonte: IBGE Censo 2022</div>
          </div>

          <div className="card space-y-3">
            <div className="w-12 h-12 rounded-lg bg-emergente/10 flex items-center justify-center text-emergente mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 6v12m-3-2.818.879.659 1.171-.196.43-.562.082-.819-.95-.95-.562-.082-.43.562-.879-.659M3 12c0 4.97 4.03 9 9 9s9-4.03 9-9-4.03-9-9-9-9 4.03-9 9Z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg">Capacidade (Renda) — Peso: 20%</h3>
            <p className="text-text-base/70">Renda per capita utilizada como indicativo se a população tem condições de arcar com planos de dados e equipamentos adequados.</p>
            <div className="text-xs font-mono text-text-base/50 pt-2">Fonte: IBGE Censo 2022</div>
          </div>

          <div className="card space-y-3">
            <div className="w-12 h-12 rounded-lg bg-conectado/10 flex items-center justify-center text-conectado mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg">Backhaul de Fibra — Peso: 10%</h3>
            <p className="text-text-base/70">Avalia se o município está conectado às rodovias principais da internet (fibras intermunicipais). É um indicador binário vital para alta velocidade.</p>
            <div className="text-xs font-mono text-text-base/50 pt-2">Fonte: Anatel</div>
          </div>
        </div>
      </section>

      {/* ── Os 4 níveis ───────────────────────────────────────────────── */}
      <section className="space-y-6">
        <h2 className="font-display text-2xl font-bold border-b border-border/50 pb-4">Tabela de Níveis</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-text-base/60">
                <th className="py-4 px-2">Score (IDD)</th>
                <th className="py-4 px-2">Nível</th>
                <th className="py-4 px-2">O que significa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              <tr className="hover:bg-surface/30 transition-colors">
                <td className="py-4 px-2 font-mono text-critico">70 a 100</td>
                <td className="py-4 px-2">
                  <span className="badge" style={{ backgroundColor: NIVEL_COLORS.CRITICO, color: '#fff' }}>Crítico</span>
                </td>
                <td className="py-4 px-2 text-text-base/80 text-sm">Deserto digital absoluto. Conectividade precária ou nula, alta exclusão. Ex: Uiramutã (RR)</td>
              </tr>
              <tr className="hover:bg-surface/30 transition-colors">
                <td className="py-4 px-2 font-mono text-vulneravel">45 a 69.9</td>
                <td className="py-4 px-2">
                  <span className="badge" style={{ backgroundColor: NIVEL_COLORS.VULNERAVEL, color: '#fff' }}>Vulnerável</span>
                </td>
                <td className="py-4 px-2 text-text-base/80 text-sm">Conectividade muito frágil. Acesso caro e de baixa qualidade predomina.</td>
              </tr>
              <tr className="hover:bg-surface/30 transition-colors">
                <td className="py-4 px-2 font-mono text-emergente">20 a 44.9</td>
                <td className="py-4 px-2">
                  <span className="badge" style={{ backgroundColor: NIVEL_COLORS.EMERGENTE, color: '#1A1D27' }}>Emergente</span>
                </td>
                <td className="py-4 px-2 text-text-base/80 text-sm">Situação intermediária. Fibra óptica chega, mas preço/renda ainda exclui parte da população.</td>
              </tr>
              <tr className="hover:bg-surface/30 transition-colors">
                <td className="py-4 px-2 font-mono text-conectado">0 a 19.9</td>
                <td className="py-4 px-2">
                  <span className="badge" style={{ backgroundColor: NIVEL_COLORS.CONECTADO, color: '#fff' }}>Conectado</span>
                </td>
                <td className="py-4 px-2 text-text-base/80 text-sm">Capitais e grandes polos. Ampla cobertura de fibra, competição entre operadoras e acesso disseminado.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Fontes e Créditos ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-border/50">
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold">As Fontes</h2>
          <ul className="space-y-3 text-sm text-text-base/70">
            <li className="flex gap-2">
              <span className="text-accent">•</span>
              <a href="https://dados.gov.br/dados/conjuntos-dados/acessos-de-banda-larga-fixa" target="_blank" rel="noreferrer" className="link">Anatel — Dados Abertos (Banda Larga)</a>
            </li>
            <li className="flex gap-2">
              <span className="text-accent">•</span>
              <a href="https://censo2022.ibge.gov.br/" target="_blank" rel="noreferrer" className="link">IBGE — Censo Demográfico 2022</a>
            </li>
            <li className="mt-4 opacity-70 italic text-xs">Os dados são atualizados conforme os lançamentos oficiais dos respectivos órgãos (geralmente semestral ou anual).</li>
          </ul>
        </section>

        <section className="space-y-4 bg-surface p-6 rounded-xl border border-border">
          <h2 className="font-display text-xl font-bold">Sobre o Projeto</h2>
          <p className="text-sm text-text-base/70 leading-relaxed">
            Desenvolvido por <strong>Rodolfo Fernandes</strong> como parte de pesquisa do <strong>FernandesLab</strong>. O código-fonte deste painel e a pipeline de dados que calcula o IDD estão abertos para a comunidade.
          </p>
          <div className="flex gap-4 pt-2">
            <a href="https://fernandeslab.com.br" target="_blank" rel="noreferrer" className="link text-sm font-semibold">fernandeslab.com.br</a>
            <a href="https://github.com/rodolfofernandes" target="_blank" rel="noreferrer" className="link text-sm font-semibold">GitHub Repo</a>
          </div>
        </section>
      </div>
    </div>
  )
}
