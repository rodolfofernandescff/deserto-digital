/**
 * useMunicipios — Hook SWR para listar municípios
 *
 * Encapsula a chamada paginada à API com cache automático e revalidação.
 * Suporta filtros por UF, nível e busca textual.
 *
 * Parâmetros:
 * - uf?: string — filtrar por unidade federativa
 * - nivel?: string — filtrar por nível de deserto
 * - page?: number — página atual (default: 1)
 * - pageSize?: number — itens por página (default: DEFAULT_PAGE_SIZE)
 *
 * Retorna:
 * - municipios: MunicipioResumo[] — lista da página atual
 * - total: number — total de resultados (para paginação)
 * - hasNext: boolean — há próxima página?
 * - isLoading: boolean
 * - isError: boolean
 * - error: Error | undefined
 * - mutate: função para forçar revalidação
 *
 * Exemplo:
 *   const { municipios, isLoading } = useMunicipios({ uf: 'BA', nivel: 'CRITICO' })
 */

import useSWR from 'swr'
import { fetcher } from '@/lib/api'
import type { MunicipioResumo, PaginatedResponse } from '@/lib/types'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'

interface UseMunicipiosParams {
  uf?: string | null
  nivel?: string | null
  page?: number
  pageSize?: number
}

export function useMunicipios(params?: UseMunicipiosParams) {
  const { uf, nivel, page = 1, pageSize = DEFAULT_PAGE_SIZE } = params ?? {}

  // Construir key do SWR (inclui query params para cache granular)
  const searchParams = new URLSearchParams()
  if (uf) searchParams.set('uf', uf)
  if (nivel) searchParams.set('nivel', nivel)
  searchParams.set('page', String(page))
  searchParams.set('page_size', String(pageSize))

  const key = `/municipios?${searchParams.toString()}`

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<MunicipioResumo>>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000, // 30s de dedup para evitar refetches desnecessários
    },
  )

  return {
    municipios: data?.items ?? [],
    total: data?.total ?? 0,
    hasNext: data?.has_next ?? false,
    page: data?.page ?? page,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}
