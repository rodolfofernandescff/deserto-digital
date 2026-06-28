/**
 * MapaLegenda — Legenda de cores do mapa (escala contínua de vulnerabilidade)
 */

export function MapaLegenda() {
  return (
    <div
      className="mt-3 px-1"
      aria-label="Legenda do mapa de desertos digitais"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-[10px] text-text-base/50 shrink-0 font-medium">Conectado</span>
        <div
          className="flex-1 h-2 rounded-full"
          style={{
            background:
              'linear-gradient(to right, #48BB78 0%, #ECC94B 35%, #ED8936 65%, #E53E3E 100%)',
          }}
          aria-hidden="true"
        />
        <span className="text-[10px] text-text-base/50 shrink-0 font-medium">Crítico</span>
      </div>
      <p className="text-[10px] text-text-base/35 mt-1.5 text-center leading-snug">
        IDD médio por estado · cores quentes = maior vulnerabilidade
      </p>
    </div>
  )
}
