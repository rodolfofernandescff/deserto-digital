/**
 * MapaLegenda — Legenda de cores do mapa (escala contínua de vulnerabilidade)
 */

export function MapaLegenda() {
  return (
    <div
      className="absolute bottom-3 left-3 right-3 sm:bottom-6 sm:left-6 sm:right-auto glass rounded-xl p-3 sm:p-5 shadow-glow z-10 sm:w-[280px] pointer-events-none"
      aria-label="Legenda do mapa de desertos digitais"
    >
      <h3 className="text-[11px] sm:text-sm font-semibold text-text-base mb-2 sm:mb-3 leading-tight opacity-90">
        Intensidade de exclusão digital por estado (IDD médio)
      </h3>

      <div
        className="h-3 sm:h-4 w-full rounded-full mb-2"
        style={{
          background:
            'linear-gradient(to right, #48BB78 0%, #ECC94B 35%, #ED8936 65%, #E53E3E 100%)',
        }}
        aria-hidden="true"
      />

      <div className="flex justify-between text-[10px] sm:text-xs text-text-base/70 font-medium">
        <span>Conectado</span>
        <span>Crítico</span>
      </div>

      <p className="text-[10px] sm:text-xs text-text-base/50 mt-2 leading-snug">
        Cores mais quentes indicam maior vulnerabilidade média nos municípios do estado.
      </p>
    </div>
  )
}
