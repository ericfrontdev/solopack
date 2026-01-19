'use client'

import useSWR from 'swr'

export function useFeedbacks() {
  const { data, error, isLoading, mutate } = useSWR('/api/feedback')

  return {
    feedbacks: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useFeedback(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/feedback/${id}` : null
  )

  return {
    feedback: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useUserUnreadCount() {
  const { data, error, isLoading, mutate } = useSWR<{ count: number }>(
    '/api/feedback/user-unread-count',
    {
      refreshInterval: 30000, // Poll every 30 seconds
    }
  )

  return {
    count: data?.count ?? 0,
    isLoading,
    isError: error,
    mutate,
  }
}
