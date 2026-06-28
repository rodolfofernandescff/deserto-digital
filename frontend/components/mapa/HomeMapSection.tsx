'use client'

import { useState } from 'react'
import { MapaBrasil } from './MapaBrasil'
import { MapaLegenda } from './MapaLegenda'
import type { EstadoMapa } from '@/lib/types'

interface HomeMapSectionProps {
  estadosData: EstadoMapa[]
}

export function HomeMapSection({ estadosData }: HomeMapSectionProps) {
  const [selectedUF, setSelectedUF] = useState<string | null>(null)

  const handleEstadoClick = (uf: string) => {
    setSelectedUF((current) => (current === uf ? null : uf))
  }

  return (
    <div className="relative w-full flex-1 min-h-[360px] flex flex-col">
      {/* Mapa ocupa toda a largura disponível */}
      <MapaBrasil
        estadosData={estadosData}
        estadoSelecionado={selectedUF}
        onEstadoClick={handleEstadoClick}
      />
      <MapaLegenda estadosData={estadosData} />
    </div>
  )
}
