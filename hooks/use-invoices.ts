'use client'

import useSWR from 'swr'
import type { Invoice, InvoiceItem, Client } from '@prisma/client'

export type InvoiceWithRelations = Invoice & {
  items: InvoiceItem[]
  client: Client
}

export function useInvoices() {
  const { data, error, isLoading, mutate } = useSWR<InvoiceWithRelations[]>('/api/invoices')

  return {
    invoices: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useInvoice(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<InvoiceWithRelations>(
    id ? `/api/invoices/${id}` : null
  )

  return {
    invoice: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useUnpaidAmounts() {
  const { data, error, isLoading, mutate } = useSWR('/api/unpaid-amounts')

  return {
    unpaidAmounts: data,
    isLoading,
    isError: error,
    mutate,
  }
}
