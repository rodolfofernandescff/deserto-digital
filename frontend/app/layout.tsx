import type { Metadata, Viewport } from 'next'
import { DM_Sans, Playfair_Display, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['400', '500', '700'],
  display: 'swap',
})

// ── Metadados globais ────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: 'Deserto Digital — Mapa da Exclusão Digital no Brasil',
    template: '%s | Deserto Digital',
  },
  description:
    'Painel interativo sobre exclusão digital nos municípios brasileiros. ' +
    'Visualize o Índice de Deserto Digital (IDD) com dados de banda larga, ' +
    'renda e infraestrutura para cada município do país.',
  keywords: [
    'exclusão digital',
    'deserto digital',
    'banda larga',
    'internet',
    'municípios',
    'Brasil',
    'IDD',
    'Anatel',
    'conectividade',
  ],
  authors: [{ name: 'FernandesLab' }],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Deserto Digital',
    title: 'Deserto Digital — Mapa da Exclusão Digital no Brasil',
    description:
      'Painel interativo com o Índice de Deserto Digital (IDD) de todos os 5.570 municípios brasileiros.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deserto Digital',
    description: 'Mapa da exclusão digital nos municípios brasileiros.',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#0F1117',
  width: 'device-width',
  initialScale: 1,
}

// ── Root Layout ──────────────────────────────────────────────────────────────
import { ReactNode } from 'react'

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="pt-BR" className={`dark ${dmSans.variable} ${playfair.variable} ${jetbrains.variable}`}>
      <body className="flex min-h-screen flex-col bg-background font-sans text-text-base antialiased selection:bg-accent/30">
        {/* Header fixo com navegação principal */}
        <Header />

        {/* Conteúdo principal — ocupa o espaço restante */}
        <main className="flex-1">{children}</main>

        {/* Footer informativo */}
        <Footer />
      </body>
    </html>
  )
}
