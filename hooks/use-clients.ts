'use client'

import useSWR from 'swr'
import type { Client } from '@prisma/client'

export type ClientWithStats = Client & {
  _count: {
    invoices: number
  }
}

export function useClients() {
  const { data, error, isLoading, mutate } = useSWR<ClientWithStats[]>('/api/clients')

  return {
    clients: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useClient(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ClientWithStats>(
    id ? `/api/clients/${id}` : null
  )

  return {
    client: data,
    isLoading,
    isError: error,
    mutate,
  }
}
