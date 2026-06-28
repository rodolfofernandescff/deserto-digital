/**
 * MapaBrasil — Mapa SVG interativo dos estados brasileiros
 */

'use client'

import { useState, useMemo, useEffect } from 'react'
import { ComposableMap, Geographies, Geography, Annotation } from 'react-simple-maps'
import { iddToColor, NIVEL_COLORS, NIVEL_LABELS, nivelFromIdd } from '@/lib/constants'
import type { EstadoMapa } from '@/lib/types'

const GEO_URL =
  'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson'

// Centroides aproximados [lon, lat] de cada estado para renderizar as siglas
const STATE_CENTROIDS: Record<string, [number, number]> = {
  AC: [-70.5,  -9.0],
  AL: [-36.6,  -9.5],
  AM: [-64.0,  -4.0],
  AP: [-51.5,   1.5],
  BA: [-41.7, -12.5],
  CE: [-39.5,  -5.0],
  DF: [-47.9, -15.8],
  ES: [-40.5, -19.7],
  GO: [-49.5, -15.9],
  MA: [-44.5,  -5.5],
  MG: [-44.5, -18.5],
  MS: [-54.7, -20.5],
  MT: [-55.0, -12.5],
  PA: [-52.5,  -4.0],
  PB: [-36.8,  -7.0],
  PE: [-37.5,  -8.5],
  PI: [-42.8,  -7.5],
  PR: [-51.6, -24.6],
  RJ: [-43.2, -22.2],
  RN: [-36.5,  -5.8],
  RO: [-63.0, -11.0],
  RR: [-61.5,   2.0],
  RS: [-53.2, -30.0],
  SC: [-50.5, -27.3],
  SE: [-37.4, -10.5],
  SP: [-48.8, -22.0],
  TO: [-48.3, -10.5],
}

interface MapaBrasilProps {
  estadosData: EstadoMapa[]
  estadoSelecionado: string | null
  onEstadoClick: (uf: string) => void
}

interface TooltipData {
  x: number
  y: number
  nome: string
  uf: string
  idd: number
  nivel: string
  pctVulneravel: number
}

export function MapaBrasil({ estadosData, estadoSelecionado, onEstadoClick }: MapaBrasilProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [mounted, setMounted] = useState(false)
  const [geoFeatures, setGeoFeatures] = useState<object[]>([])
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)

    const media = window.matchMedia('(max-width: 767px)')
    const updateMobile = () => setIsMobile(media.matches)
    updateMobile()
    media.addEventListener('change', updateMobile)

    fetch(GEO_URL)
      .then((res) => res.json())
      .then((data) => {
        if (data?.features) {
          setGeoFeatures(data.features)
        }
      })
      .catch((err) => console.error('Erro ao baixar mapa:', err))

    return () => media.removeEventListener('change', updateMobile)
  }, [])

  const estadosMap = useMemo(() => {
    const map = new Map<string, EstadoMapa>()
    estadosData.forEach((e) => map.set(e.uf, e))
    return map
  }, [estadosData])

  const getColor = (uf: string) => {
    const est = estadosMap.get(uf)
    if (!est) return '#2D3148'
    return iddToColor(est.idd_medio)
  }

  const projectionScale = isMobile ? 620 : 750

  return (
    <div className="relative w-full aspect-[3/4] sm:aspect-[4/3] flex items-center justify-center overflow-hidden touch-manipulation">
      {mounted && geoFeatures.length > 0 && (
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: projectionScale, center: [-54, -15] }}
          className="w-full h-full animate-fade-in"
        >
          <Geographies geography={geoFeatures}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const uf = geo.properties.sigla || geo.properties.id || geo.id
                const isSelected = estadoSelecionado === uf
                const estado = estadosMap.get(uf)
                const color = getColor(uf)

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={color}
                    stroke={isSelected ? '#1B9AAA' : '#1A1D27'}
                    strokeWidth={isSelected ? 2 : 0.5}
                    className="transition-all duration-300 outline-none"
                    style={{
                      default: { outline: 'none' },
                      hover: {
                        outline: 'none',
                        stroke: '#1B9AAA',
                        strokeWidth: 2,
                        cursor: 'pointer',
                        opacity: 0.85,
                      },
                      pressed: { outline: 'none' },
                    }}
                    onMouseEnter={(e) => {
                      if (!estado) return
                      setTooltip({
                        x: e.clientX,
                        y: e.clientY,
                        nome: geo.properties.name || geo.properties.nome || uf,
                        uf,
                        idd: estado.idd_medio,
                        nivel: estado.nivel_predominante,
                        pctVulneravel: estado.pct_vulneravel,
                      })
                    }}
                    onMouseMove={(e) => {
                      setTooltip((prev) =>
                        prev ? { ...prev, x: e.clientX, y: e.clientY } : null,
                      )
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => onEstadoClick(uf)}
                  />
                )
              })
            }
          </Geographies>

          {/* Siglas dos estados — visíveis apenas quando o mapa estiver carregado */}
          {Object.entries(STATE_CENTROIDS).map(([uf, coords]) => (
            <Annotation
              key={`label-${uf}`}
              subject={coords}
              dx={0}
              dy={0}
              connectorProps={{ stroke: 'none', strokeWidth: 0 }}
            >
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.90)"
                stroke="rgba(0,0,0,0.55)"
                strokeWidth={isMobile ? 2.5 : 3}
                paintOrder="stroke fill"
                fontSize={isMobile ? 6 : 8}
                fontWeight={700}
                fontFamily="'JetBrains Mono', 'Fira Code', monospace"
                letterSpacing="0.05em"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {uf}
              </text>
            </Annotation>
          ))}
        </ComposableMap>
      )}

      {mounted && geoFeatures.length === 0 && (
        <p className="text-sm text-text-base/50 px-4 text-center">Carregando mapa…</p>
      )}

      {tooltip && (
        <div
          className="fixed pointer-events-none glass px-4 py-3 rounded-lg shadow-glow z-50 animate-fade-in flex flex-col gap-1 w-52 max-w-[calc(100vw-2rem)]"
          style={{
            top: Math.min(tooltip.y + 15, window.innerHeight - 140),
            left: Math.min(tooltip.x + 15, window.innerWidth - 220),
          }}
        >
          <div className="flex justify-between items-baseline gap-2">
            <span className="font-bold text-sm text-text-base truncate">{tooltip.nome}</span>
            <span className="text-xs text-text-base/60 font-mono shrink-0">{tooltip.uf}</span>
          </div>

          <div className="flex justify-between items-center text-xs mt-1">
            <span className="text-text-base/80">IDD médio:</span>
            <span className="font-mono font-semibold">{tooltip.idd.toFixed(1)}</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-text-base/80">Municípios vulneráveis:</span>
            <span className="font-mono font-semibold text-vulneravel">
              {tooltip.pctVulneravel.toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                backgroundColor:
                  NIVEL_COLORS[nivelFromIdd(tooltip.idd)] ||
                  NIVEL_COLORS[tooltip.nivel as keyof typeof NIVEL_COLORS] ||
                  '#999',
              }}
            />
            <span className="text-xs font-medium uppercase tracking-wider text-text-base/90">
              {NIVEL_LABELS[nivelFromIdd(tooltip.idd)] ||
                NIVEL_LABELS[tooltip.nivel as keyof typeof NIVEL_LABELS] ||
                tooltip.nivel}
            </span>
          </div>

          <div className="text-[10px] text-accent mt-2 pt-2 border-t border-border/50 text-right font-medium">
            Ver municípios →
          </div>
        </div>
      )}
    </div>
  )
}
