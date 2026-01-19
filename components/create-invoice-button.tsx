'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Folder } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CreateInvoiceForProjectModal } from '@/components/crm/create-invoice-for-project-modal'
import { useTranslation } from '@/lib/i18n-context'
import { logger } from '@/lib/logger'

type Client = {
  id: string
  name: string
  company?: string | null
}

type Project = {
  id: string
  name: string
  clientId: string
  client: {
    id: string
    name: string
  }
}

export function CreateInvoiceButton() {
  const { t } = useTranslation()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  // Load clients and projects on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(res => {
        logger.debug('[CreateInvoiceButton] Clients response status:', res.status, res.ok)
        if (!res.ok) {
          logger.error('[CreateInvoiceButton] Clients API error:', res.status, res.statusText)
          return []
        }
        return res.json()
      }),
      fetch('/api/projects').then(res => {
        logger.debug('[CreateInvoiceButton] Projects response status:', res.status, res.ok)
        if (!res.ok) {
          logger.error('[CreateInvoiceButton] Projects API error:', res.status, res.statusText)
          return []
        }
        return res.json()
      }),
    ])
      .then(([clientsData, projectsData]) => {
        logger.debug('[CreateInvoiceButton] Clients data:', clientsData)
        logger.debug('[CreateInvoiceButton] Projects data:', projectsData)

        const filteredClients = Array.isArray(clientsData)
          ? clientsData.filter((c: Client & { archived?: boolean }) => !c.archived)
          : []
        const filteredProjects = Array.isArray(projectsData)
          ? projectsData.filter((p: Project & { status?: string }) => p.status === 'active')
          : []

        logger.debug('[CreateInvoiceButton] Filtered clients:', filteredClients)
        logger.debug('[CreateInvoiceButton] Filtered projects:', filteredProjects)

        setClients(filteredClients)
        setProjects(filteredProjects)
        setLoading(false)
      })
      .catch((error) => {
        logger.error('[CreateInvoiceButton] Error loading data:', error)
        setLoading(false)
      })
  }, [])

  const openInvoiceModal = (client: Client, project?: Project) => {
    setSelectedClient(client)
    setSelectedProject(project || null)
    setIsModalOpen(true)
  }

  const handleCreateInvoice = async (items: { description: string; amount: number }[]) => {
    setCreating(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedProject ? selectedProject.clientId : selectedClient?.id,
          projectId: selectedProject?.id || null,
          items,
        }),
      })

      if (res.ok) {
        const invoice = await res.json()
        setIsModalOpen(false)
        setSelectedClient(null)
        setSelectedProject(null)
        router.refresh()
        router.push(`/invoices?view=${invoice.id}`)
      }
    } catch (error) {
      logger.error('Error creating invoice:', error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="cursor-pointer" disabled={loading || creating}>
          <Plus className="h-4 w-4 mr-2" />
          {t('invoices.newInvoice')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {loading ? (
          <div className="px-2 py-3 text-sm text-muted-foreground text-center">
            {t('common.loading')}
          </div>
        ) : (
          <>
            {/* Section: Facture ponctuelle */}
            <DropdownMenuLabel className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              {t('invoices.oneTimeInvoice')}
            </DropdownMenuLabel>
            {clients.length === 0 ? (
              <div className="px-2 py-2 text-sm text-muted-foreground">
                {t('clients.noClients')}
              </div>
            ) : (
              clients.map((client) => (
                <DropdownMenuItem
                  key={client.id}
                  onClick={() => openInvoiceModal(client)}
                  disabled={creating}
                  className="cursor-pointer"
                >
                  <div className="flex-1">
                    <p className="font-medium">{client.name}</p>
                    {client.company && (
                      <p className="text-xs text-muted-foreground">{client.company}</p>
                    )}
                  </div>
                </DropdownMenuItem>
              ))
            )}

            <DropdownMenuSeparator />

            {/* Section: Pour un projet */}
            <DropdownMenuLabel className="flex items-center">
              <Folder className="h-4 w-4 mr-2" />
              {t('projects.title')}
            </DropdownMenuLabel>
            {projects.length === 0 ? (
              <div className="px-2 py-2 text-sm text-muted-foreground">
                {t('projects.noProjects')}
              </div>
            ) : (
              projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => openInvoiceModal({ id: project.clientId, name: project.client.name }, project)}
                  disabled={creating}
                  className="cursor-pointer"
                >
                  <div className="flex-1">
                    <p className="font-medium">{project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {project.client.name}
                    </p>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>

    <CreateInvoiceForProjectModal
      isOpen={isModalOpen}
      onClose={() => {
        setIsModalOpen(false)
        setSelectedClient(null)
        setSelectedProject(null)
      }}
      onSave={handleCreateInvoice}
      project={selectedProject}
      client={selectedClient}
    />
  </>
  )
}
