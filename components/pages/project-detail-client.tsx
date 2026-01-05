'use client'

import Link from 'next/link'
import { ArrowLeft, Building2, Calendar, DollarSign, FileText, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectActions } from '@/components/project-actions'
import { ProjectFilesList } from '@/components/project-files-list'
import { ProjectInvoicesList } from '@/components/project-invoices-list'
import { PaymentAgreementSection } from '@/components/payment-agreement-section'
import { useTranslation } from '@/lib/i18n-context'

type InvoiceItem = {
  id: string
  invoiceId: string
  description: string
  amount: number
  date: Date
  dueDate: Date | null
}

type ProjectWithRelations = {
  id: string
  name: string
  description: string | null
  status: string
  budget: number | null
  startDate: Date | null
  endDate: Date | null
  createdAt: Date
  client: {
    id: string
    name: string
    company: string | null
    email: string
  }
  invoices: Array<{
    id: string
    number: string
    subtotal: number
    tps: number
    tvq: number
    total: number
    status: string
    items: InvoiceItem[]
    createdAt: Date
  }>
  files: Array<{
    id: string
    filename: string
    fileUrl: string
    fileSize: number
    mimeType: string
    uploadedAt: Date
  }>
  paymentAgreement: {
    id: string
    numberOfInstallments: number
    frequency: number
    amountPerInstallment: number
    status: string
    confirmedAt: Date | null
    createdAt: Date
    token: string
  } | null
  _count: {
    invoices: number
    files: number
  }
}

const statusColors = {
  active: 'bg-green-100 text-green-800 dark:bg-green-400/10 dark:text-green-300',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-400/10 dark:text-blue-300',
  onhold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-400/10 dark:text-red-300',
}

export function ProjectDetailClient({ project }: { project: ProjectWithRelations }) {
  const { t, locale } = useTranslation()

  const statusLabels = {
    active: t('projects.statusActive'),
    completed: t('projects.statusCompleted'),
    onhold: t('projects.statusOnHold'),
    cancelled: t('projects.statusCancelled'),
  }

  // Ne compter que les factures payées
  const totalInvoiced = project.invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0)

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/projets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('projects.backToProjects')}
          </Button>
        </Link>
      </div>

      {/* Project Info */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  statusColors[project.status as keyof typeof statusColors]
                }`}
              >
                {statusLabels[project.status as keyof typeof statusLabels]}
              </span>
            </div>
            {project.description && (
              <p className="text-muted-foreground">{project.description}</p>
            )}
          </div>
        </div>

        {/* Client Info */}
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{t('projects.client')}:</span>
          <Link href={`/clients/${project.client.id}`} className="underline">
            {project.client.company || project.client.name}
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="flex flex-wrap gap-4 pt-4 border-t items-end">
          <div className="flex-1 min-w-[150px]">
            {project.budget && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>{t('projects.budget')}</span>
                </div>
                <p className="text-2xl font-semibold">{project.budget.toFixed(2)} $</p>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-[150px]">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{t('projects.invoiced')}</span>
              </div>
              <p className="text-2xl font-semibold">{totalInvoiced.toFixed(2)} $</p>
            </div>
          </div>
          <div className="flex-1 min-w-[150px]">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{t('projects.invoices')}</span>
              </div>
              <p className="text-2xl font-semibold">{project._count.invoices}</p>
            </div>
          </div>
          <div className="flex-1 min-w-[150px]">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Paperclip className="h-4 w-4" />
                <span>{t('projects.files')}</span>
              </div>
              <p className="text-2xl font-semibold">{project._count.files}</p>
            </div>
          </div>
          <div className="space-y-1 ml-auto">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>{t('projects.actions')}</span>
            </div>
            <ProjectActions project={project} clientId={project.client.id} />
          </div>
        </div>

        {/* Dates */}
        {(project.startDate || project.endDate) && (
          <div className="flex items-center gap-4 pt-4 border-t text-sm">
            {project.startDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('projects.start')}:</span>
                <span>
                  {new Date(project.startDate).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
            {project.endDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('projects.end')}:</span>
                <span>
                  {new Date(project.endDate).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Agreement */}
      {project.paymentAgreement && (
        <PaymentAgreementSection
          agreement={project.paymentAgreement}
          projectName={project.name}
          clientEmail={project.client.email}
        />
      )}

      {/* Invoices */}
      <ProjectInvoicesList
        invoices={project.invoices}
        projectId={project.id}
        clientId={project.client.id}
        clientName={project.client.company || project.client.name}
      />

      {/* Files */}
      <ProjectFilesList files={project.files} />
    </div>
  )
}
