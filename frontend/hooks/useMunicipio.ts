/**
 * useMunicipio — Hook SWR para dados detalhados de um município
 *
 * Busca os dados completos (MunicipioDetalhe) de um município por código IBGE.
 * Inclui componentes do IDD, informações de backhaul, renda, etc.
 *
 * Parâmetros:
 * - codigo: string | null — código IBGE de 7 dígitos (null = não buscar)
 *
 * Retorna:
 * - municipio: MunicipioDetalhe | undefined
 * - isLoading: boolean
 * - isError: boolean
 * - error: Error | undefined
 * - mutate: função para forçar revalidação
 *
 * Exemplo:
 *   const { municipio, isLoading } = useMunicipio('3550308') // São Paulo
 */

import useSWR from 'swr'
import { fetcher } from '@/lib/api'
import type { MunicipioDetalhe } from '@/lib/types'

export function useMunicipio(codigo: string | null) {
  // Key condicional: se codigo é null, SWR não faz fetch
  const key = codigo ? `/municipios/${codigo}` : null

  const { data, error, isLoading, mutate } = useSWR<MunicipioDetalhe>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000, // 60s — dados de município mudam pouco
    },
  )

  return {
    municipio: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}
