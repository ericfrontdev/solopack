'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Edit, Upload, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProjectModal } from '@/components/crm/project-modal'
import { CreateInvoiceForProjectModal } from '@/components/crm/create-invoice-for-project-modal'
import { UploadDocumentsModal } from '@/components/crm/upload-documents-modal'
import { useTranslation } from '@/lib/i18n-context'
import { logger } from '@/lib/logger'

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

export function ProjectActions({ project, clientId }: { project: Project; clientId: string }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  const handleEditProject = async (
    data: {
      name: string
      description: string | null
      status: string
      budget: string | number | null
      startDate: string | null
      endDate: string | null
    },
    _files: File[]
  ) => {
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Failed to update project')

      setIsEditModalOpen(false)
      router.refresh()
    } catch (error) {
      logger.error('Error updating project:', error)
      throw error
    }
  }

  const handleCreateInvoice = async (items: { description: string; amount: number }[]) => {
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          projectId: project.id,
          items,
        }),
      })

      if (!res.ok) throw new Error('Failed to create invoice')

      setIsInvoiceModalOpen(false)
      router.refresh()
    } catch (error) {
      logger.error('Error creating invoice:', error)
      throw error
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            {t('common.edit')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsInvoiceModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('crm.projectCard.createInvoice')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsUploadModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            {t('projects.uploadFile')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modals */}
      <ProjectModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          router.refresh()
        }}
        onSave={handleEditProject}
        project={project}
      />

      <CreateInvoiceForProjectModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false)
          router.refresh()
        }}
        onSave={handleCreateInvoice}
        project={project}
      />

      <UploadDocumentsModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false)
          router.refresh()
        }}
        projectId={project.id}
      />
    </>
  )
}
