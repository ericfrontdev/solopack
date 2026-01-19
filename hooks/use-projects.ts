'use client'

import useSWR from 'swr'
import type { Project, Client, Invoice, ProjectFile, PaymentAgreement } from '@prisma/client'

export type ProjectWithRelations = Project & {
  client: Client
  invoices: Invoice[]
  files: ProjectFile[]
  paymentAgreement: PaymentAgreement | null
}

export function useProjects() {
  const { data, error, isLoading, mutate } = useSWR<ProjectWithRelations[]>('/api/projects')

  return {
    projects: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useProject(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ProjectWithRelations>(
    id ? `/api/projects/${id}` : null
  )

  return {
    project: data,
    isLoading,
    isError: error,
    mutate,
  }
}
