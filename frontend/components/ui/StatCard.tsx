/**
 * StatCard — Card de estatística com número em destaque
 *
 * Props:
 * - label: string — título descritivo acima do número
 * - value: string | number — valor principal em destaque
 * - sublabel?: string — texto auxiliar abaixo do número
 * - color?: string — cor hex para o número (default: herda do tema)
 * - icon?: string — emoji opcional exibido ao lado do label
 */

interface StatCardProps {
  label: string
  value: string | number
  sublabel?: string
  color?: string
  icon?: string
}

export function StatCard({
  label,
  value,
  sublabel,
  color,
  icon,
}: StatCardProps) {
  return (
    <div className="card group relative overflow-hidden">
      {/* Decorative gradient line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: color
            ? `linear-gradient(90deg, transparent, ${color}, transparent)`
            : 'linear-gradient(90deg, transparent, #1B9AAA, transparent)',
        }}
      />

      <p className="text-xs font-semibold text-text-base/50 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        {icon && <span aria-hidden="true">{icon}</span>}
        {label}
      </p>

      <p
        className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono leading-none"
        style={color ? { color } : undefined}
      >
        {value}
      </p>

      {sublabel && (
        <p className="text-sm text-text-base/40 mt-2">{sublabel}</p>
      )}
    </div>
  )
}
