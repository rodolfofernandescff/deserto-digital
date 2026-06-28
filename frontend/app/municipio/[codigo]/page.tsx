/**
 * /municipio/[codigo] — Perfil detalhado de um município
 *
 * Server Component com generateMetadata dinâmico.
 * Renderiza MunicipioContent (Client) para dados interativos.
 *
 * Layout em duas colunas (desktop) / uma coluna (mobile):
 * - Esquerda: IDDGauge + Badge + dados principais
 * - Direita: ComponentesBar + explicação textual
 * - Seção "O que isso significa?" em linguagem simples
 * - Links de volta para ranking e estado
 * - Tratamento de 404 se município não encontrado
 */

import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { nivelLabel } from '@/lib/utils'
import { MunicipioContent } from '@/components/municipio/MunicipioContent'

interface MunicipioPageProps {
  params: Promise<{ codigo: string }>
}

export async function generateMetadata({ params }: MunicipioPageProps): Promise<Metadata> {
  const { codigo } = await params

  try {
    const municipio = await api.getMunicipio(codigo)
    const nivel = nivelLabel(municipio.nivel_deserto)

    return {
      title: `${municipio.nome} (${municipio.uf}) — Perfil Digital`,
      description:
        `${municipio.nome} está classificado como "${nivel}" no Índice de Deserto Digital. ` +
        `Score IDD: ${municipio.idd_score?.toFixed(1) ?? '—'}. ` +
        `${municipio.percentual_sem_internet.toFixed(1)}% dos domicílios sem internet.`,
      openGraph: {
        title: `${municipio.nome} (${municipio.uf}) — Deserto Digital`,
        description: `Perfil de conectividade de ${municipio.nome}. Nível: ${nivel}.`,
      },
    }
  } catch {
    return {
      title: 'Município não encontrado',
      description: 'O município solicitado não foi encontrado no banco de dados.',
    }
  }
}

export default async function MunicipioPage({ params }: MunicipioPageProps) {
  const { codigo } = await params

  return (
    <div className="container-app py-8 animate-fade-in">
      <MunicipioContent codigo={codigo} />
    </div>
  )
}
