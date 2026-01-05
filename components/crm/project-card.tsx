'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  Edit,
  FileText,
  Folder,
  Trash2,
  Plus,
  Upload,
  ArrowRight,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n-context'

type Project = {
  id: string
  name: string
  description: string | null
  status: string
  budget: number | null
  startDate: Date | null
  endDate: Date | null
  invoices: Array<{
    id: string
    total: number
    status: string
  }>
  files: Array<{
    id: string
  }>
}

const statusColors = {
  active: 'bg-green-100 text-green-800 dark:bg-green-400/10 dark:text-green-300',
  completed:
    'bg-blue-100 text-blue-800 dark:bg-blue-400/10 dark:text-blue-300',
  paused:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-400/10 dark:text-red-300',
}

export function ProjectCard({
  project,
  onEdit,
  onDelete,
  onCreateInvoice,
  onUploadDocuments,
}: {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (projectId: string) => void
  onCreateInvoice: (project: Project) => void
  onUploadDocuments: (project: Project) => void
}) {
  const { t, locale } = useTranslation()
  const [isFlipped, setIsFlipped] = useState(false)

  const statusLabels: Record<string, string> = {
    active: t('projects.active'),
    completed: t('projects.completed'),
    paused: t('projects.onHold'),
    cancelled: t('projects.cancelled'),
  }
  // Ne compter que les factures payées
  const totalInvoiced = project.invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0)
  const percentageBudget = project.budget
    ? Math.round((totalInvoiced / project.budget) * 100)
    : 0

  return (
    <div
      className="relative h-80 w-full perspective-1000 cursor-pointer overflow-visible"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      {/* Card Container */}
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
        whileHover={{ rotateY: isFlipped ? 185 : 5 }}
      >
        {/* Front Face */}
        <div className="absolute inset-0 backface-hidden rounded-lg border bg-card p-4 shadow-md">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{project.name}</h3>
              <span
                className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                  statusColors[project.status as keyof typeof statusColors] ||
                  statusColors.active
                }`}
              >
                {statusLabels[project.status as keyof typeof statusLabels] || project.status}
              </span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(project)
                }}
                className="cursor-pointer"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(project.id)
                }}
                className="cursor-pointer text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {project.description}
            </p>
          )}

          {/* Stats */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{project.invoices.length} {t('crm.projectCard.invoices')}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Folder className="h-4 w-4" />
                <span>{project.files.length} {t('crm.projectCard.files')}</span>
              </div>
            </div>

            {project.budget && (
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{t('crm.projectCard.budget')}</span>
                  <span className="font-medium">
                    {totalInvoiced.toFixed(2)} $ / {project.budget.toFixed(2)} $
                  </span>
                </div>
                <div className="h-2 w-full rounded bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(percentageBudget, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {(project.startDate || project.endDate) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {project.startDate
                    ? new Date(project.startDate).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')
                    : '?'}{' '}
                  -{' '}
                  {project.endDate
                    ? new Date(project.endDate).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')
                    : '?'}
                </span>
              </div>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t('crm.projectCard.clickForMore')}
            </p>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Back Face */}
        <div className="absolute inset-0 backface-hidden rounded-lg border bg-secondary px-6 py-4 shadow-md rotate-y-180">
          <div className="flex flex-col h-full">
            <h3 className="font-semibold text-lg mb-3">{project.name}</h3>

            {/* Additional Info */}
            <div className="space-y-2 flex-1">
              <div className="text-sm">
                <p className="text-muted-foreground">{t('crm.projectCard.status')}</p>
                <p className="font-medium">
                  {statusLabels[project.status as keyof typeof statusLabels] || project.status}
                </p>
              </div>

              {project.description && (
                <div className="text-sm">
                  <p className="text-muted-foreground">{t('crm.projectCard.description')}</p>
                  <p className="line-clamp-3 text-xs">{project.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('crm.projectCard.invoices')}</p>
                  <p className="font-medium">{project.invoices.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('crm.projectCard.files')}</p>
                  <p className="font-medium">{project.files.length}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  onCreateInvoice(project)
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('crm.projectCard.createInvoice')}
              </Button>
              <Button
                size="sm"
                className="flex-1 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  onUploadDocuments(project)
                }}
              >
                <Upload className="h-4 w-4 mr-1" />
                {t('crm.projectCard.upload')}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
