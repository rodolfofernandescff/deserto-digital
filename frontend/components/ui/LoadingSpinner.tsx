/**
 * LoadingSpinner — Indicador de carregamento
 *
 * Spinner animado com a cor accent do design system.
 * Exibe mensagem opcional abaixo do spinner.
 *
 * Props:
 * - size?: 'sm' | 'md' | 'lg' — diâmetro do spinner
 * - message?: string — texto abaixo do spinner (ex: "Carregando municípios...")
 *
 * Exemplo: <LoadingSpinner message="Carregando dados..." />
 */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

const SIZE_MAP = {
  sm: 'h-5 w-5 border-2',
  md: 'h-10 w-10 border-3',
  lg: 'h-16 w-16 border-4',
} as const

export function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12" role="status">
      <div
        className={`${SIZE_MAP[size]} rounded-full border-border border-t-accent animate-spin`}
        aria-hidden="true"
      />
      {message && (
        <p className="text-sm text-text-base/50 animate-pulse">{message}</p>
      )}
      <span className="sr-only">Carregando...</span>
    </div>
  )
}
