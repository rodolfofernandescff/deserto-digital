import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Níveis de deserto digital (semaforização)
        critico: '#E53E3E',
        vulneravel: '#ED8936',
        emergente: '#ECC94B',
        conectado: '#48BB78',
        // Dark theme — FernandesLab identity
        background: '#0F1117',
        surface: '#1A1D27',
        border: '#2D3148',
        'text-base': '#E2E8F0',
        accent: '#1B9AAA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        card: '0.75rem',
      },
      boxShadow: {
        card: '0 4px 24px 0 rgba(0,0,0,0.4)',
        glow: '0 0 16px rgba(27,154,170,0.35)',
      },
    },
  },
  plugins: [],
}

export default config
