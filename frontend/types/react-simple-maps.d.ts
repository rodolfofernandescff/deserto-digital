declare module 'react-simple-maps' {
  import { ComponentProps, ReactNode } from 'react'

  export interface ComposableMapProps {
    projection?: string
    projectionConfig?: {
      scale?: number
      center?: [number, number]
      rotate?: [number, number, number]
    }
    width?: number
    height?: number
    className?: string
    style?: React.CSSProperties
    children?: ReactNode
  }

  export function ComposableMap(props: ComposableMapProps): JSX.Element

  export interface GeographiesProps {
    geography: string | object | object[]
    children: (args: { geographies: Geography[] }) => ReactNode
  }

  export function Geographies(props: GeographiesProps): JSX.Element

  export interface GeographyProps {
    geography: Geography
    fill?: string
    stroke?: string
    strokeWidth?: number
    className?: string
    style?: {
      default?: React.CSSProperties
      hover?: React.CSSProperties
      pressed?: React.CSSProperties
    }
    onMouseEnter?: (event: React.MouseEvent<SVGPathElement>) => void
    onMouseMove?: (event: React.MouseEvent<SVGPathElement>) => void
    onMouseLeave?: (event: React.MouseEvent<SVGPathElement>) => void
    onClick?: (event: React.MouseEvent<SVGPathElement>) => void
    [key: string]: unknown
  }

  export interface Geography {
    rsmKey: string
    properties: Record<string, string>
    id: string
    [key: string]: unknown
  }

  export function Geography(props: GeographyProps): JSX.Element

  export interface AnnotationProps {
    subject: [number, number]
    dx?: number
    dy?: number
    connectorProps?: React.SVGProps<SVGPathElement>
    children?: ReactNode
    style?: React.CSSProperties
  }

  export function Annotation(props: AnnotationProps): JSX.Element

  export interface ZoomableGroupProps {
    zoom?: number
    center?: [number, number]
    minZoom?: number
    maxZoom?: number
    translateExtent?: [[number, number], [number, number]]
    filterZoomEvent?: (event: WheelEvent | TouchEvent | MouseEvent) => boolean
    onMoveStart?: (position: { coordinates: [number, number]; zoom: number }, event: MouseEvent | TouchEvent) => void
    onMove?: (position: { x: number; y: number; zoom: number; dragging: boolean }) => void
    onMoveEnd?: (position: { coordinates: [number, number]; zoom: number }) => void
    className?: string
    children?: ReactNode
  }

  export function ZoomableGroup(props: ZoomableGroupProps): JSX.Element

  export interface LineProps {
    from: [number, number]
    to: [number, number]
    stroke?: string
    strokeWidth?: number
    strokeLinecap?: string
    strokeDasharray?: string
    className?: string
    style?: React.CSSProperties
    [key: string]: unknown
  }

  export function Line(props: LineProps): JSX.Element
}
