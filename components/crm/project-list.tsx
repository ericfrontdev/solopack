'use client'

import { Button } from '@/components/ui/button'
import { Edit, Trash2, Plus, Upload } from 'lucide-react'
import { useTranslation } from '@/lib/i18n-context'

type Project = {
  id: string
  name: string
  status: string
  budget: number | null
  startDate: Date | null
  endDate: Date | null
  invoices: Array<{ total: number; status: string }>
  files: Array<{ id: string }>
}

export function ProjectList({
  projects,
  onEdit,
  onDelete,
  onCreateInvoice,
  onUploadDocuments,
}: {
  projects: Project[]
  onEdit: (project: Project) => void
  onDelete: (projectId: string) => void
  onCreateInvoice: (project: Project) => void
  onUploadDocuments: (project: Project) => void
}) {
  const { t, locale } = useTranslation()

  const statusLabels: Record<string, string> = {
    active: t('projects.active'),
    completed: t('projects.completed'),
    paused: t('projects.onHold'),
    cancelled: t('projects.cancelled'),
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="text-left p-3 font-medium">{t('common.name')}</th>
            <th className="text-left p-3 font-medium">{t('common.status')}</th>
            <th className="text-left p-3 font-medium">{t('projects.budget')}</th>
            <th className="text-left p-3 font-medium">{t('crm.overview.invoiced')}</th>
            <th className="text-left p-3 font-medium">{t('crm.projectCard.files')}</th>
            <th className="text-left p-3 font-medium">{t('common.date')}</th>
            <th className="text-right p-3 font-medium">{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => {
            // Ne compter que les factures payées
            const totalInvoiced = project.invoices
              .filter((inv) => inv.status === 'paid')
              .reduce((sum, inv) => sum + inv.total, 0)
            return (
              <tr key={project.id} className="border-t hover:bg-muted/50">
                <td className="p-3 font-medium">{project.name}</td>
                <td className="p-3">
                  <span className="inline-block px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                    {statusLabels[project.status as keyof typeof statusLabels]}
                  </span>
                </td>
                <td className="p-3">
                  {project.budget ? `${project.budget.toFixed(2)} $` : '-'}
                </td>
                <td className="p-3">{totalInvoiced.toFixed(2)} $</td>
                <td className="p-3">{project.files.length}</td>
                <td className="p-3 text-sm text-muted-foreground">
                  {project.startDate
                    ? new Date(project.startDate).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')
                    : '?'}{' '}
                  -{' '}
                  {project.endDate
                    ? new Date(project.endDate).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')
                    : '?'}
                </td>
                <td className="p-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCreateInvoice(project)}
                      className="cursor-pointer"
                      title={t('crm.projectCard.createInvoice')}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUploadDocuments(project)}
                      className="cursor-pointer"
                      title={t('crm.projectCard.upload')}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(project)}
                      className="cursor-pointer"
                      title={t('common.edit')}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(project.id)}
                      className="cursor-pointer text-destructive"
                      title={t('common.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
