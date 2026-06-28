/**
 * MunicipioCard — Card resumo de um município
 *
 * Exibe informações resumidas de um município em formato de card,
 * usado em listagens, destaques (pior/melhor de um estado) e buscas.
 *
 * Props:
 * - municipio: MunicipioResumo — dados do município
 * - label?: string — rótulo contextual (ex: "Mais crítico", "Mais conectado")
 * - showUF?: boolean — exibe a UF ao lado do nome (default: true)
 * - href?: string — link customizado (default: /municipio/[codigo])
 *
 * Exibe: nome, UF, badge de nível, IDD score, % sem internet, população.
 * Card é inteiramente clicável (Link wrapper).
 */

// import Link from 'next/link'
import type { MunicipioResumo } from '@/lib/types'
// import { Badge } from '@/components/ui/Badge'
// import { formatScore, formatPercent, formatNumber } from '@/lib/utils'

interface MunicipioCardProps {
  municipio: MunicipioResumo
  label?: string
  showUF?: boolean
  href?: string
}

export function MunicipioCard({
  municipio,
  label,
  showUF = true,
  href,
}: MunicipioCardProps) {
  // TODO: Implementar card clicável
  // 1. Wrapper com <Link> para href ?? `/municipio/${municipio.codigo_ibge}`
  // 2. Badge de nível no canto superior direito
  // 3. Nome do município + UF como título
  // 4. Linha de métricas: IDD score, % sem internet, população
  // 5. Label opcional (ex: "Mais crítico") com cor contextual
  // 6. Hover com borda accent e sombra glow

  const _href = href ?? `/municipio/${municipio.codigo_ibge}`

  return (
    <div className="card cursor-pointer">
      {label && (
        <span className="text-xs font-semibold text-accent uppercase tracking-wider">
          {label}
        </span>
      )}
      <h3 className="text-lg font-bold">
        {municipio.nome}
        {showUF && (
          <span className="text-text-base/50 font-normal ml-1">
            — {municipio.uf}
          </span>
        )}
      </h3>
      {/* TODO: Métricas e Badge */}
    </div>
  )
}
