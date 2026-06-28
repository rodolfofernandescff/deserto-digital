/**
 * /estados/[uf] — Visão detalhada de um estado
 *
 * Server Component com generateMetadata dinâmico.
 * Renderiza EstadoContent (Client) para dados interativos.
 *
 * Exibe:
 * - Header com nome do estado + UF
 * - 4 StatCards: total municípios, % desertos, pior município, IDD médio
 * - Distribuição por nível com barra empilhada
 * - Mini lista dos 5 piores municípios do estado
 * - Links de navegação
 */

import type { Metadata } from 'next'
import { UFS } from '@/lib/constants'
import { api } from '@/lib/api'
import { EstadoContent } from '@/components/estado/EstadoContent'

interface EstadoPageProps {
  params: Promise<{ uf: string }>
}

export async function generateMetadata({ params }: EstadoPageProps): Promise<Metadata> {
  const { uf } = await params
  const ufUpper = uf.toUpperCase()
  const ufInfo = UFS.find((u) => u.sigla === ufUpper)
  const nomeEstado = ufInfo?.nome ?? ufUpper

  try {
    const estado = await api.getEstado(ufUpper)

    return {
      title: `${nomeEstado} (${ufUpper}) — Exclusão Digital`,
      description:
        `Panorama da exclusão digital em ${nomeEstado}: ${estado.total_municipios} municípios, ` +
        `IDD médio de ${estado.idd_medio?.toFixed(1) ?? '—'}. ` +
        `Veja a distribuição por nível de deserto digital.`,
      openGraph: {
        title: `${nomeEstado} — Deserto Digital`,
        description: `Conectividade digital nos ${estado.total_municipios} municípios de ${nomeEstado}.`,
      },
    }
  } catch {
    return {
      title: `${nomeEstado} — Exclusão Digital`,
      description: `Panorama da conectividade e exclusão digital em ${nomeEstado}.`,
    }
  }
}

export default async function EstadoPage({ params }: EstadoPageProps) {
  const { uf } = await params
  const ufUpper = uf.toUpperCase()

  return (
    <div className="container-app py-8 animate-fade-in">
      <EstadoContent uf={ufUpper} />
    </div>
  )
}
