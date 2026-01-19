'use client'

import useSWR from 'swr'

export type Notification = {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

export function useNotifications(limit: number = 10) {
  const { data, error, isLoading, mutate } = useSWR<Notification[]>(
    `/api/notifications?limit=${limit}`
  )

  return {
    notifications: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useUnreadCount() {
  const { data, error, isLoading, mutate } = useSWR<{ count: number }>(
    '/api/notifications/unread-count',
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
