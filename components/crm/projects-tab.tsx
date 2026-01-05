'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LayoutGrid, List, Plus, AlertTriangle } from 'lucide-react'
import { ProjectCard } from './project-card'
import { ProjectList } from './project-list'
import { ProjectModal } from './project-modal'
import { CreateInvoiceForProjectModal } from './create-invoice-for-project-modal'
import { UploadDocumentsModal } from './upload-documents-modal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useTranslation } from '@/lib/i18n-context'

type Project = {
  id: string
  name: string
  description: string | null
  status: string
  budget: number | null
  startDate: Date | null
  endDate: Date | null
  createdAt: Date
  invoices: Array<{
    id: string
    number: string
    total: number
    status: string
  }>
  files: Array<{
    id: string
    filename: string
    fileSize: number
    mimeType: string
    uploadedAt: Date
  }>
}

type ClientWithProjects = {
  id: string
  name: string
  projects: Project[]
  invoices?: Array<{
    id: string
    number: string
    total: number
    status: string
  }>
}

export function ProjectsTab({
  client,
  externalProjectModalOpen,
  onExternalProjectModalClose,
}: {
  client: ClientWithProjects
  externalProjectModalOpen?: boolean
  onExternalProjectModalClose?: () => void
}) {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false)
  const [invoiceProject, setInvoiceProject] = useState<Project | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadingProject, setUploadingProject] = useState<Project | null>(null)
  const router = useRouter()

  const handleCreateProject = () => {
    setEditingProject(null)
    setIsModalOpen(true)
  }

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingProject(null)
    if (onExternalProjectModalClose) {
      onExternalProjectModalClose()
    }
  }

  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project)
    setIsDeleteDialogOpen(true)
  }

  const handleCreateInvoice = (project: Project) => {
    setInvoiceProject(project)
    setIsCreateInvoiceModalOpen(true)
  }

  const handleUploadDocuments = (project: Project) => {
    setUploadingProject(project)
    setIsUploadModalOpen(true)
  }

  const handleSaveProject = async (
    data: { name: string; description: string | null; status: string; budget: string | number | null; startDate: string | null; endDate: string | null },
    files: File[],
    paymentPlan?: { numberOfInstallments: number; frequency: number }
  ) => {
    const url = editingProject
      ? `/api/projects/${editingProject.id}`
      : `/api/projects`

    const method = editingProject ? 'PATCH' : 'POST'

    const body = editingProject
      ? data
      : { ...data, clientId: client.id, paymentPlan }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const projectData = await res.json()

      // Upload files if any
      if (files.length > 0 && projectData.id) {
        for (const file of files) {
          const formData = new FormData()
          formData.append('file', file)

          await fetch(`/api/projects/${projectData.id}/files`, {
            method: 'POST',
            body: formData,
          })
        }
      }

      router.refresh()
      handleCloseModal()
    }
  }

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return

    const res = await fetch(`/api/projects/${projectToDelete.id}`, {
      method: 'DELETE',
    })

    if (res.ok) {
      setIsDeleteDialogOpen(false)
      setProjectToDelete(null)
      router.refresh()
    }
  }

  const handleSaveCreateInvoice = async (
    items: { description: string; amount: number }[]
  ) => {
    if (!invoiceProject) return

    // Créer d'abord les unpaid amounts pour ce projet
    const amountIds: string[] = []
    for (const item of items) {
      const res = await fetch('/api/unpaid-amounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          projectId: invoiceProject.id,
          description: item.description,
          amount: item.amount,
          date: new Date().toISOString(),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        amountIds.push(data.id)
      }
    }

    // Créer la facture avec ces montants
    if (amountIds.length > 0) {
      await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          unpaidAmountIds: amountIds,
          projectId: invoiceProject.id,
        }),
      })
    }

    setIsCreateInvoiceModalOpen(false)
    setInvoiceProject(null)
    router.refresh()
  }

  const handleSaveUploadDocuments = async (files: File[]) => {
    if (!uploadingProject) return

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)

      await fetch(`/api/projects/${uploadingProject.id}/files`, {
        method: 'POST',
        body: formData,
      })
    }

    setIsUploadModalOpen(false)
    setUploadingProject(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'cards' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="cursor-pointer"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="cursor-pointer"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        <Button onClick={handleCreateProject} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          {t('projects.newProject')}
        </Button>
      </div>

      {/* Content */}
      {client.projects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>{t('crm.overview.noProjects')}</p>
          <Button
            onClick={handleCreateProject}
            variant="outline"
            className="mt-4 cursor-pointer"
          >
            {t('projects.createFirstProject')}
          </Button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
          {client.projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project as never}
              onEdit={handleEditProject as never}
              onDelete={() => handleDeleteClick(project)}
              onCreateInvoice={handleCreateInvoice as never}
              onUploadDocuments={handleUploadDocuments as never}
            />
          ))}
        </div>
      ) : (
        <ProjectList
          projects={client.projects as never}
          onEdit={handleEditProject as never}
          onDelete={(projectId) => {
            const project = client.projects.find((p) => p.id === projectId)
            if (project) handleDeleteClick(project)
          }}
          onCreateInvoice={handleCreateInvoice as never}
          onUploadDocuments={handleUploadDocuments as never}
        />
      )}

      {/* Edit/Create Modal */}
      <ProjectModal
        isOpen={isModalOpen || externalProjectModalOpen || false}
        onClose={handleCloseModal}
        onSave={handleSaveProject}
        project={editingProject}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 grid place-items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <AlertDialogHeader>
                <AlertDialogTitle>{t('projects.deleteProject')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('projects.deleteConfirm')}
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Invoice Modal */}
      <CreateInvoiceForProjectModal
        isOpen={isCreateInvoiceModalOpen}
        onClose={() => {
          setIsCreateInvoiceModalOpen(false)
          setInvoiceProject(null)
        }}
        onSave={handleSaveCreateInvoice}
        project={invoiceProject}
      />

      {/* Upload Documents Modal */}
      <UploadDocumentsModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false)
          setUploadingProject(null)
        }}
        projectId={uploadingProject?.id || ''}
      />
    </div>
  )
}
