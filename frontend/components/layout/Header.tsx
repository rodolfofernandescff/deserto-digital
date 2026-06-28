/**
 * Header — Barra de navegação principal
 *
 * Layout:
 * - Logo/nome do projeto à esquerda (link para /)
 * - Navegação principal ao centro (desktop) ou menu hambúrguer (mobile)
 * - Efeito de glassmorphism no background
 * - Fixed no topo com z-index alto
 *
 * Links:
 * - Mapa (/)
 * - Ranking (/ranking)
 * - Sobre (/sobre)
 *
 * Client Component — toggle do menu mobile.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Nav } from './Nav'

export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50 bg-surface/60 backdrop-blur-lg">
      <div className="container-app flex items-center justify-between h-16">
        {/* ── Logo / Brand ──────────────────────────────────────────── */}
        <Link
          href="/"
          className="flex items-center gap-3 group"
          aria-label="Deserto Digital — página inicial"
        >
          {/* Ícone de Wi-Fi sem conexão (Wi-Fi com X) */}
          <div
            className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform duration-300"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
              <path d="M22 8.82a15 15 0 0 0-11.17-3.65" />
              <path d="M5 12.86a10 10 0 0 1 14 0" />
              <path d="M8.5 16.43a5 5 0 0 1 7 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
              <line x1="2" y1="2" x2="22" y2="22" className="text-critico opacity-80" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">
            <span className="text-text-base">Deserto </span>
            <span className="text-accent/80 font-medium">Digital</span>
          </span>
        </Link>

        {/* ── Navegação ─────────────────────────────────────────────── */}
        <Nav currentPath={pathname} />
      </div>
    </header>
  )
}
