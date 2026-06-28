/**
 * ErrorState — Estado de erro para falhas de carregamento
 *
 * Renderiza uma mensagem de erro amigável com:
 * - Ícone de erro
 * - Título genérico ou customizado
 * - Mensagem técnica (quando disponível)
 * - Botão de "tentar novamente" (callback opcional)
 *
 * Props:
 * - title?: string — título do erro (default: "Algo deu errado")
 * - message?: string — detalhe técnico
 * - onRetry?: () => void — callback para retry (exibe botão se definido)
 *
 * Exemplo: <ErrorState message="Servidor indisponível" onRetry={() => mutate()} />
 */

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Algo deu errado',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      {/* Ícone de erro */}
      <div className="text-5xl" aria-hidden="true">
        ⚠️
      </div>

      {/* Mensagem principal */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-text-base">{title}</h2>
        {message && (
          <p className="text-sm text-text-base/50 max-w-md">{message}</p>
        )}
      </div>

      {/* Botão retry */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-6 py-2 rounded-lg bg-accent text-white font-medium
                     hover:bg-accent/80 transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2
                     focus:ring-offset-background"
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}
