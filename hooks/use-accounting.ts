'use client'

import useSWR from 'swr'
import type { Revenue, Expense } from '@prisma/client'

export function useRevenues() {
  const { data, error, isLoading, mutate } = useSWR<Revenue[]>('/api/revenues')

  return {
    revenues: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useExpenses() {
  const { data, error, isLoading, mutate } = useSWR<Expense[]>('/api/expenses')

  return {
    expenses: data,
    isLoading,
    isError: error,
    mutate,
  }
}
