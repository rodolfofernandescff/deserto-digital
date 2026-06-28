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
}
