'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { ComposableMap, Geographies, Geography, Annotation, ZoomableGroup } from 'react-simple-maps'
import { iddToColor, NIVEL_COLORS, NIVEL_LABELS, nivelFromIdd, COR_SEM_DADOS, UFS } from '@/lib/constants'
import type { EstadoMapa, NivelDeserto } from '@/lib/types'
import Link from 'next/link'

const GEO_URL =
  'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson'

// Centroides [lon, lat] para siglas dentro de cada estado
const STATE_CENTROIDS: Record<string, [number, number]> = {
  AC: [-70.5,  -9.2],
  AL: [-36.6,  -9.5],
  AM: [-64.5,  -4.5],
  AP: [-51.9,   1.4],
  BA: [-41.5, -12.5],
  CE: [-39.6,  -5.2],
  DF: [-47.8, -15.75],
  ES: [-40.6, -19.8],
  GO: [-49.8, -15.8],
  MA: [-44.5,  -5.0],
  MG: [-44.5, -18.2],
  MS: [-54.8, -20.8],
  MT: [-55.5, -12.8],
  PA: [-52.5,  -4.5],
  PB: [-36.6,  -7.1],
  PE: [-37.8,  -8.3],
  PI: [-42.8,  -7.3],
  PR: [-51.5, -24.8],
  RJ: [-43.3, -22.5],
  RN: [-36.5,  -5.7],
  RO: [-62.8, -11.0],
  RR: [-61.0,   2.5],
  RS: [-53.5, -29.5],
  SC: [-50.5, -27.5],
  SE: [-37.4, -10.7],
  SP: [-49.0, -22.2],
  TO: [-48.3, -10.2],
}

// Estados muito pequenos: fonte menor, visíveis só com zoom
const STATE_FONT_SIZE: Partial<Record<string, number>> = {
  DF: 7, SE: 9, AL: 9, RN: 9, PB: 9, RJ: 9, ES: 10, SC: 11,
}
// Estados que ficam ilegíveis no zoom base — só aparecem com zoom > 1.8
const TINY_STATES = new Set(['DF', 'SE', 'RJ', 'ES', 'AL', 'RN', 'PB'])

const DEFAULT_FONT_SIZE = 14
const MOBILE_FONT_SIZE = 11
const MAP_CENTER: [number, number] = [-54, -15]
const HINT_KEY = 'deserto:map-interacted'

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

// Mini gauge IDD
function IDDBar({ idd }: { idd: number }) {
  const pct = Math.min(100, Math.max(0, idd))
  const color = iddToColor(idd) ?? COR_SEM_DADOS
  return (
    <div className="w-full h-1.5 rounded-full bg-border/40 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${NIVEL_COLORS.CONECTADO}, ${color})`,
        }}
      />
    </div>
  )
}

// Stacked bar distribuição de níveis
function NiveisDistribuicao({ distribuicao, total }: {
  distribuicao: Partial<Record<NivelDeserto, number>>
  total: number
}) {
  if (total === 0) return null
  const niveis: NivelDeserto[] = ['CONECTADO', 'EMERGENTE', 'VULNERAVEL', 'CRITICO']
  return (
    <div className="flex w-full h-1.5 rounded-full overflow-hidden bg-border/30">
      {niveis.map((nivel) => {
        const count = distribuicao[nivel] ?? 0
        if (count === 0) return null
        return (
          <div
            key={nivel}
            className="h-full transition-all duration-500"
            style={{ width: `${(count / total) * 100}%`, backgroundColor: NIVEL_COLORS[nivel] }}
            title={`${NIVEL_LABELS[nivel]}: ${count}`}
          />
        )
      })}
    </div>
  )
}

// Hint de interação — aparece na primeira visita, some após interação
function MapInteractionHint({ visible, isMobile }: { visible: boolean; isMobile: boolean }) {
  if (!visible) return null
  return (
    <div className="absolute bottom-14 sm:bottom-16 inset-x-0 flex justify-center z-30 pointer-events-none animate-fade-in">
      <div className="flex items-center gap-2 glass rounded-full px-4 py-2 shadow-glow animate-hint-float">
        {/* ícone de cursor / toque */}
        <span className="text-accent animate-hint-pulse" aria-hidden="true">
          {isMobile ? (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11 18V9.5l-2.5 2.5-1.4-1.4L11 7l4 3.6-1.4 1.4L11 9.5V18h-2zm0 4C5.48 22 1 17.52 1 12S5.48 2 11 2s10 4.48 10 10-4.48 10-10 10zm0-18C6.59 4 3 7.59 3 12s3.59 8 8 8 8-3.59 8-8-3.59-8-8-8z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1 1 20.25 10.5M8.288 14.212A5.25 5.25 0 1 1 17.25 10.5" />
            </svg>
          )}
        </span>
        <span className="text-[11px] sm:text-xs font-medium text-text-base/75 select-none">
          {isMobile ? 'Toque' : 'Clique'} em um estado
        </span>
      </div>
    </div>
  )
}

export function MapaBrasil({ estadosData, estadoSelecionado, onEstadoClick }: MapaBrasilProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [mounted, setMounted] = useState(false)
  const [geoFeatures, setGeoFeatures] = useState<object[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [animationReady, setAnimationReady] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: MAP_CENTER,
    zoom: 1,
  })

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
          requestAnimationFrame(() => setAnimationReady(true))
        }
      })
      .catch((err) => console.error('Erro ao baixar mapa:', err))

    return () => media.removeEventListener('change', updateMobile)
  }, [])

  // Mostra hint 1.2s após o mapa carregar, some em 10s — não reaparece
  useEffect(() => {
    if (!animationReady) return
    if (typeof window === 'undefined') return
    if (localStorage.getItem(HINT_KEY)) return

    const showTimer = setTimeout(() => {
      setShowHint(true)
      hintTimerRef.current = setTimeout(() => setShowHint(false), 10_000)
    }, 1200)

    return () => {
      clearTimeout(showTimer)
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    }
  }, [animationReady])

  const dismissHint = useCallback(() => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    setShowHint(false)
    if (typeof window !== 'undefined') localStorage.setItem(HINT_KEY, '1')
  }, [])

  const estadosMap = useMemo(() => {
    const map = new Map<string, EstadoMapa>()
    estadosData.forEach((e) => map.set(e.uf.toUpperCase(), e))
    return map
  }, [estadosData])

  const getColor = useCallback((uf: string) => {
    const est = estadosMap.get(uf?.toUpperCase())
    if (!est) return COR_SEM_DADOS
    return iddToColor(est.idd_medio)
  }, [estadosMap])

  const estadoInfo = useMemo(() => {
    if (!estadoSelecionado) return null
    const est = estadosMap.get(estadoSelecionado)
    if (!est) return null
    const nome = UFS.find((u) => u.sigla === estadoSelecionado)?.nome ?? estadoSelecionado
    return { ...est, nome }
  }, [estadoSelecionado, estadosMap])

  const handleDeselect = useCallback(() => {
    onEstadoClick(estadoSelecionado ?? '')
  }, [estadoSelecionado, onEstadoClick])

  const handleMoveEnd = useCallback(
    (pos: { coordinates: [number, number]; zoom: number }) => setPosition(pos),
    [],
  )

  const handleZoomIn = useCallback(
    () => setPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.6, 8) })),
    [],
  )

  const handleZoomOut = useCallback(
    () => setPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.6, 1) })),
    [],
  )

  const handleReset = useCallback(
    () => setPosition({ coordinates: MAP_CENTER, zoom: 1 }),
    [],
  )

  // Desktop: viewBox landscape (1050×660) preenche ~80% da largura disponível
  // Mobile: viewBox retrato (680×760) casado com a proporção do Brasil
  // Desktop 1050×660 (landscape) — preenche ~80% da largura do hero
  // Mobile 680×700 (quasi-square) — viewBox menor reduz espaço vazio acima do Brasil
  const mapWidth = isMobile ? 680 : 1050
  const mapHeight = isMobile ? 700 : 660
  const projectionScale = isMobile ? 720 : 870

  // Labels escalam inversamente ao zoom para manter tamanho visual constante
  const labelFontScale = 1 / Math.sqrt(position.zoom)
  // Estados tiny só aparecem com zoom suficiente
  const tinyLabelThreshold = 1.6

  return (
    <div className="relative w-full flex-1 min-h-[360px] sm:min-h-[460px] aspect-[97/100] sm:aspect-[4/3] lg:aspect-auto lg:h-full flex items-center justify-center overflow-hidden touch-manipulation">

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10 opacity-[0.025] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '128px 128px',
        }}
      />

      {mounted && geoFeatures.length > 0 && (
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: projectionScale, center: MAP_CENTER }}
          width={mapWidth}
          height={mapHeight}
          className="w-full h-full"
          style={{
            opacity: animationReady ? 1 : 0,
            transition: 'opacity 0.5s ease',
            cursor: position.zoom > 1 ? 'grab' : 'default',
            // Compensa espaço vazio do canvas SVG acima do RR (5°N)
            // O SVG tem ~100/700 de espaço vazio no topo antes do Brasil
            marginTop: isMobile ? '-12%' : '0',
          }}
        >
          <defs>
            <filter id="selected-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#4DD8E8" floodOpacity="0.65" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={handleMoveEnd}
            minZoom={1}
            maxZoom={8}
          >
            <Geographies geography={geoFeatures}>
              {({ geographies }) =>
                geographies.map((geo, index) => {
                  const rawUf = geo.properties?.sigla || geo.properties?.id || geo.id || ''
                  const uf = typeof rawUf === 'string' ? rawUf.toUpperCase() : String(rawUf)
                  const isSelected = estadoSelecionado === uf
                  const isOtherSelected = estadoSelecionado !== null && !isSelected
                  const estado = estadosMap.get(uf)
                  const color = getColor(uf)
                  const hasData = !!estado

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={color}
                      stroke={isSelected ? '#4DD8E8' : '#0F1117'}
                      strokeWidth={isSelected ? 2 / position.zoom : 0.5 / position.zoom}
                      className="outline-none"
                      style={{
                        default: {
                          outline: 'none',
                          transition: 'filter 0.3s ease, opacity 0.3s ease',
                          filter: isSelected
                            ? 'url(#selected-glow) drop-shadow(0 2px 6px rgba(0,0,0,0.4))'
                            : 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                          opacity: animationReady
                            ? (isOtherSelected ? 0.35 : 1)
                            : 0,
                          animation: animationReady
                            ? `stateReveal 0.45s ease-out ${index * 0.02}s both`
                            : 'none',
                        },
                        hover: {
                          outline: 'none',
                          stroke: '#4DD8E8',
                          strokeWidth: 2 / position.zoom,
                          cursor: hasData ? 'pointer' : 'default',
                          filter: 'drop-shadow(0 0 18px rgba(77,216,232,0.65)) brightness(1.22)',
                          opacity: 1,
                          transition: 'filter 0.12s ease-out, opacity 0.12s ease-out',
                        },
                        pressed: {
                          outline: 'none',
                          filter: 'brightness(0.88)',
                          transition: 'filter 0.08s ease',
                        },
                      }}
                      onMouseEnter={(e) => {
                        dismissHint()
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
                      onClick={() => {
                        if (hasData) {
                          dismissHint()
                          onEstadoClick(uf)
                        }
                      }}
                    />
                  )
                })
              }
            </Geographies>

            {/* Siglas dos estados */}
            {Object.entries(STATE_CENTROIDS).map(([uf, coords]) => {
              const isSelected = estadoSelecionado === uf
              const isOtherSelected = estadoSelecionado !== null && !isSelected
              const isTiny = TINY_STATES.has(uf)

              // Tiny states hidden below zoom threshold
              if (isTiny && position.zoom < tinyLabelThreshold) return null

              const baseFontSize = STATE_FONT_SIZE[uf] ?? DEFAULT_FONT_SIZE
              const mobileBase = STATE_FONT_SIZE[uf] ?? MOBILE_FONT_SIZE
              const fontSize = (isMobile ? mobileBase : baseFontSize) * labelFontScale

              return (
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
                    fill={isSelected ? '#ffffff' : 'rgba(255,255,255,0.95)'}
                    stroke="rgba(0,0,0,0.85)"
                    strokeWidth={(isMobile ? 5 : 7) * labelFontScale}
                    paintOrder="stroke fill"
                    fontSize={isSelected ? fontSize * 1.1 : fontSize}
                    fontWeight={isSelected ? 900 : 800}
                    fontFamily="'JetBrains Mono', 'Fira Code', monospace"
                    letterSpacing="0.02em"
                    style={{
                      pointerEvents: 'none',
                      userSelect: 'none',
                      opacity: isOtherSelected ? 0.25 : 1,
                      transition: 'opacity 0.3s ease',
                    }}
                  >
                    {uf}
                  </text>
                </Annotation>
              )
            })}
          </ZoomableGroup>
        </ComposableMap>
      )}

      {/* Hint de interação */}
      <MapInteractionHint visible={showHint} isMobile={isMobile} />

      {/* Zoom controls */}
      {mounted && geoFeatures.length > 0 && (
        <div className="absolute bottom-10 right-2 z-20 flex flex-col gap-1">
          <button
            onClick={handleZoomIn}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-surface/80 border border-border/40
                       text-text-base/70 hover:text-text-base hover:bg-surface
                       backdrop-blur-sm flex items-center justify-center
                       text-lg font-light leading-none transition-all select-none"
            aria-label="Ampliar"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-surface/80 border border-border/40
                       text-text-base/70 hover:text-text-base hover:bg-surface
                       backdrop-blur-sm flex items-center justify-center
                       text-lg font-light leading-none transition-all select-none"
            aria-label="Reduzir"
          >
            −
          </button>
          {position.zoom > 1.05 && (
            <button
              onClick={handleReset}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-surface/80 border border-border/40
                         text-text-base/40 hover:text-text-base hover:bg-surface
                         backdrop-blur-sm flex items-center justify-center
                         text-sm transition-all select-none"
              aria-label="Resetar zoom"
            >
              ↺
            </button>
          )}
        </div>
      )}

      {/* Loading state */}
      {mounted && geoFeatures.length === 0 && (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-sm text-text-base/50 px-4 text-center">Carregando mapa…</p>
        </div>
      )}

      {/* Callout do estado selecionado */}
      {estadoInfo && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-56 sm:w-[16rem] z-20 animate-slide-up">
          <div className="callout-glass rounded-xl p-3.5 sm:p-4 flex flex-col gap-2.5">

            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-extrabold text-text-base leading-tight truncate">
                  {estadoInfo.nome}
                </h2>
                <p className="text-[10px] text-text-base/40 font-mono mt-0.5">{estadoInfo.uf}</p>
              </div>
              <button
                onClick={handleDeselect}
                className="text-text-base/30 hover:text-text-base transition-colors shrink-0
                           w-6 h-6 rounded-md hover:bg-border/30 flex items-center justify-center"
                aria-label="Fechar painel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* IDD Score */}
            <div>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-3xl sm:text-4xl font-mono font-extrabold leading-none tabular-nums"
                  style={{ color: iddToColor(estadoInfo.idd_medio) ?? undefined }}
                >
                  {estadoInfo.idd_medio.toFixed(1)}
                </span>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse-slow"
                    style={{ backgroundColor: NIVEL_COLORS[nivelFromIdd(estadoInfo.idd_medio)] || '#999' }}
                  />
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-text-base/60">
                    {NIVEL_LABELS[nivelFromIdd(estadoInfo.idd_medio)] || estadoInfo.nivel_predominante}
                  </span>
                </div>
              </div>
              <p className="text-[9px] text-text-base/35 uppercase tracking-widest mt-0.5 font-medium">
                IDD médio
              </p>
              <div className="mt-1.5">
                <IDDBar idd={estadoInfo.idd_medio} />
              </div>
            </div>

            {/* Métricas */}
            <div className="flex flex-col gap-1 text-xs pt-2 border-t border-border/20">
              <div className="flex justify-between items-center">
                <span className="text-text-base/50">Vulneráveis</span>
                <span className="font-mono font-semibold text-critico tabular-nums">
                  {estadoInfo.pct_vulneravel.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-base/50">Sem internet</span>
                <span className="font-mono font-semibold text-vulneravel tabular-nums">
                  {estadoInfo.pct_sem_internet_medio.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-base/50">Municípios</span>
                <span className="font-mono font-semibold text-text-base/80 tabular-nums">
                  {estadoInfo.total_municipios}
                </span>
              </div>
            </div>

            {/* Distribuição */}
            {estadoInfo.distribuicao_niveis && (
              <div className="space-y-1">
                <p className="text-[8px] text-text-base/30 uppercase tracking-wider font-medium">
                  Distribuição por nível
                </p>
                <NiveisDistribuicao
                  distribuicao={estadoInfo.distribuicao_niveis}
                  total={estadoInfo.total_municipios}
                />
                <div className="flex gap-2 flex-wrap">
                  {(['CONECTADO', 'EMERGENTE', 'VULNERAVEL', 'CRITICO'] as NivelDeserto[]).map((n) => {
                    const count = estadoInfo.distribuicao_niveis?.[n] ?? 0
                    if (count === 0) return null
                    return (
                      <span key={n} className="flex items-center gap-0.5 text-[8px] text-text-base/40">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: NIVEL_COLORS[n] }} />
                        {count}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* CTA */}
            <Link
              href={`/estados/${estadoInfo.uf.toLowerCase()}`}
              className="flex justify-center items-center gap-1.5 py-2
                         bg-accent/10 hover:bg-accent/20
                         border border-accent/25 hover:border-accent/50
                         rounded-lg text-accent font-semibold transition-all text-xs
                         group shadow-sm hover:shadow-glow"
            >
              Ver municípios
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="transition-transform group-hover:translate-x-0.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* Tooltip hover */}
      {tooltip && !estadoSelecionado && (
        <div
          className="fixed pointer-events-none glass px-3.5 py-2.5 rounded-lg shadow-glow z-50
                     animate-fade-in flex flex-col gap-1 w-48 max-w-[calc(100vw-2rem)]"
          style={{
            top: Math.min(tooltip.y + 14, (typeof window !== 'undefined' ? window.innerHeight : 800) - 130),
            left: Math.min(tooltip.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 600) - 200),
          }}
        >
          <div className="flex justify-between items-baseline gap-2">
            <span className="font-bold text-sm text-text-base truncate">{tooltip.nome}</span>
            <span className="text-[10px] text-text-base/60 font-mono shrink-0">{tooltip.uf}</span>
          </div>

          <div className="flex justify-between items-center text-xs mt-0.5">
            <span className="text-text-base/70">IDD médio:</span>
            <span className="font-mono font-semibold" style={{ color: iddToColor(tooltip.idd) ?? undefined }}>
              {tooltip.idd.toFixed(1)}
            </span>
          </div>

          <div className="mt-1">
            <IDDBar idd={tooltip.idd} />
          </div>

          <div className="flex justify-between items-center text-xs mt-0.5">
            <span className="text-text-base/70">Vulneráveis:</span>
            <span className="font-mono font-semibold text-vulneravel">
              {tooltip.pctVulneravel.toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                backgroundColor:
                  NIVEL_COLORS[nivelFromIdd(tooltip.idd)] ||
                  NIVEL_COLORS[tooltip.nivel as keyof typeof NIVEL_COLORS] ||
                  '#999',
              }}
            />
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-base/80">
              {NIVEL_LABELS[nivelFromIdd(tooltip.idd)] ||
                NIVEL_LABELS[tooltip.nivel as keyof typeof NIVEL_LABELS] ||
                tooltip.nivel}
            </span>
          </div>

          <div className="text-[9px] text-accent mt-1 pt-1.5 border-t border-border/40 text-right font-medium">
            Clique para detalhes →
          </div>
        </div>
      )}
    </div>
  )
}
