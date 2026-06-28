/**
 * Nav — Links de navegação
 *
 * Renderiza os links de navegação do site, com indicação visual da
 * página ativa (underline accent + cor). Responsivo: no mobile exibe
 * menu hambúrguer que abre um painel lateral.
 *
 * Props:
 * - currentPath: string — pathname atual para destacar link ativo
 *
 * Client Component — toggle mobile e detecção de rota.
 */

'use client'

import Link from 'next/link'
import { useState } from 'react'

interface NavProps {
  currentPath: string
}

const NAV_ITEMS = [
  { href: '/', label: 'Mapa' },
  { href: '/ranking', label: 'Ranking' },
  { href: '/sobre', label: 'Sobre' },
] as const

export function Nav({ currentPath }: NavProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/') return currentPath === '/'
    return currentPath.startsWith(href)
  }

  return (
    <>
      {/* ── Desktop Nav ───────────────────────────────────────────── */}
      <nav className="hidden md:flex items-center gap-1" aria-label="Navegação principal">
        {NAV_ITEMS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
              isActive(href)
                ? 'text-accent bg-accent/10'
                : 'text-text-base/60 hover:text-text-base hover:bg-surface/80'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* ── Mobile Menu Button ────────────────────────────────────── */}
      <button
        className="md:hidden p-2 rounded-lg hover:bg-surface/80 transition-colors"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={mobileOpen}
      >
        <svg
          className="w-6 h-6 text-text-base"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          {mobileOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* ── Mobile Panel ──────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 glass border-b border-border/50 animate-slide-up">
          <nav className="container-app py-4 flex flex-col gap-1" aria-label="Navegação mobile">
            {NAV_ITEMS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive(href)
                    ? 'text-accent bg-accent/10'
                    : 'text-text-base/60 hover:text-text-base hover:bg-surface/80'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  )
}
