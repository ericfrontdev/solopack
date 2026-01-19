'use client'

import { SWRConfig } from 'swr'
import { ReactNode } from 'react'

const fetcher = async (url: string) => {
  const res = await fetch(url)

  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')
    // Attach extra info to the error object
    const errorData = await res.json().catch(() => ({}))
    Object.assign(error, { info: errorData, status: res.status })
    throw error
  }

  return res.json()
}

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 2000,
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        onError: (error, key) => {
          // Log errors for debugging
          if (error.status !== 404) {
            console.error('[SWR Error]', key, error)
          }
        },
      }}
    >
      {children}
    </SWRConfig>
  )
}
