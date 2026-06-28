/**
 * useStats — Hook SWR para estatísticas gerais do painel
 *
 * Busca os dados agregados (StatsGerais) usados na homepage e
 * em componentes de resumo.
 *
 * Retorna:
 * - stats: StatsGerais | undefined
 * - isLoading: boolean
 * - isError: boolean
 * - error: Error | undefined
 * - mutate: função para forçar revalidação
 *
 * Os dados incluem:
 * - total_municipios: número total de municípios
 * - distribuicao_niveis: quantos municípios em cada nível
 * - percentual_desertos: % em Crítico + Vulnerável
 * - municipios_sem_backhaul: quantos sem fibra
 * - mes_referencia: mês dos dados da Anatel
 *
 * Exemplo:
 *   const { stats, isLoading } = useStats()
 */

import useSWR from 'swr'
import { fetcher } from '@/lib/api'
import type { StatsGerais } from '@/lib/types'

export function useStats() {
  const { data, error, isLoading, mutate } = useSWR<StatsGerais>(
    '/admin/stats',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 120_000, // 2min — stats mudam raramente
    },
  )

  return {
    stats: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}
