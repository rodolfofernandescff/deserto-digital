import type {
  EstadoMapa,
  EstadoResumo,
  HealthStatus,
  MunicipioDetalhe,
  MunicipioResumo,
  PaginatedResponse,
  StatsGerais,
} from './types'

// ── Error type ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ── ApiClient ────────────────────────────────────────────────────────────────

export class ApiClient {
  private baseUrl: string

  constructor() {
    // Em SSR (Server Components): chama o backend diretamente
    // No browser: usa /api que é proxiado pelo Next.js rewrite (next.config.ts)
    this.baseUrl =
      typeof window === 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000')
        : '/api'
  }

  /** GET genérico com query params opcionais */
  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    let url = `${this.baseUrl}${path}`

    if (params) {
      const q = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          q.set(key, value)
        }
      }
      const qs = q.toString()
      if (qs) url += `?${qs}`
    }

    const fetchOptions: RequestInit & { next?: { revalidate?: number } } = {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 }, // ISR: revalida a cada 60s em Server Components
    }

    const res = await fetch(url, fetchOptions as RequestInit)

    if (!res.ok) {
      const body: any = await res.json().catch(() => ({}))
      throw new ApiError(res.status, body.error ?? res.statusText, body.detail)
    }

    return res.json() as Promise<T>
  }

  // ── Endpoints tipados ──────────────────────────────────────────────────────

  health() {
    return this.get<HealthStatus>('/health')
  }

  getMunicipios(params?: {
    uf?: string
    nivel?: string
    page?: number
    page_size?: number
  }) {
    const p: Record<string, string> = {}
    if (params?.uf) p.uf = params.uf
    if (params?.nivel) p.nivel = params.nivel
    if (params?.page) p.page = String(params.page)
    if (params?.page_size) p.page_size = String(params.page_size)
    return this.get<PaginatedResponse<MunicipioResumo>>('/municipios', p)
  }

  getMunicipio(codigo: string) {
    return this.get<MunicipioDetalhe>(`/municipios/${codigo}`)
  }

  searchMunicipios(query: string, limit = 10) {
    return this.get<MunicipioResumo[]>('/municipios/search', {
      q: query,
      limit: String(limit),
    })
  }

  getRanking(params?: { limit?: number; uf?: string; nivel?: string }) {
    const p: Record<string, string> = {}
    if (params?.uf) p.uf = params.uf
    if (params?.nivel) p.nivel = params.nivel
    if (params?.limit) p.limit = String(params.limit)
    return this.get<MunicipioResumo[]>('/ranking', p)
  }

  getEstado(uf: string) {
    return this.get<EstadoResumo>(`/estados/${uf}`)
  }

  getEstados() {
    return this.get<EstadoMapa[]>('/estados')
  }

  getStats() {
    return this.get<StatsGerais>('/admin/stats')
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────
export const api = new ApiClient()

// ── Fetcher para SWR (recebe a key como URL relativa) ────────────────────────
export async function fetcher<T>(url: string): Promise<T> {
  return api.get<T>(url)
}
