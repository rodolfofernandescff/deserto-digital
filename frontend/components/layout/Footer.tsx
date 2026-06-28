import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-surface/30 mt-auto">
      <div className="container-app py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* ── Coluna 1: Brand ────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-sm font-bold text-text-base">
              🏜️ Deserto Digital
            </p>
            <p className="text-xs text-text-base/40 leading-relaxed">
              Mapeando a exclusão digital nos municípios brasileiros.
              Um projeto FernandesLab.
            </p>
          </div>

          {/* ── Coluna 2: Links ────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-text-base/50 uppercase tracking-wider">
              Navegação
            </p>
            <nav className="flex flex-col gap-1" aria-label="Links do rodapé">
              <Link href="/" className="text-xs text-text-base/50 hover:text-accent transition-colors">Mapa</Link>
              <Link href="/ranking" className="text-xs text-text-base/50 hover:text-accent transition-colors">Ranking</Link>
              <Link href="/sobre" className="text-xs text-text-base/50 hover:text-accent transition-colors">Sobre</Link>
            </nav>
          </div>

          {/* ── Coluna 3: Fontes ───────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-text-base/50 uppercase tracking-wider">
              Fontes de dados
            </p>
            <p className="text-xs text-text-base/40 leading-relaxed">
              Anatel (banda larga, backhaul) · IBGE/Censo (domicílios, renda, internet)
            </p>
          </div>
        </div>

        {/* ── Copyright ───────────────────────────────────────────── */}
        <div className="mt-8 pt-4 border-t border-border/30 text-center">
          <p className="text-xs text-text-base/30">
            © {new Date().getFullYear()} FernandesLab · Dados abertos para um Brasil mais conectado
          </p>
        </div>
      </div>
    </footer>
  )
}
