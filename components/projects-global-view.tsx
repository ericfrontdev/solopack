'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, FolderOpen, FileText, Paperclip, ArrowUpRight, Plus } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { ProjectModal } from '@/components/crm/project-modal'
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
  client: {
    id: string
    name: string
    company: string | null
  }
  _count: {
    invoices: number
    files: number
  }
}

type Client = {
  id: string
  name: string
  company: string | null
}

const statusColors = {
  active: 'bg-green-100 text-green-800 dark:bg-green-400/10 dark:text-green-300',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-400/10 dark:text-blue-300',
  onhold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-400/10 dark:text-red-300',
}

export function ProjectsGlobalView({ projects, clients }: { projects: Project[]; clients: Client[] }) {
  const { t, locale } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const router = useRouter()

  const statusLabels = {
    active: t('projects.active'),
    completed: t('projects.completed'),
    onhold: t('projects.onHold'),
    cancelled: t('projects.cancelled'),
  }

  // Filtrer par statut
  const statusFiltered = projects.filter((project) => {
    if (statusFilter === 'all') return true
    return project.status === statusFilter
  })

  // Filtrer par recherche
  const filtered = statusFiltered.filter((project) => {
    const search = searchTerm.toLowerCase()
    return (
      project.name.toLowerCase().includes(search) ||
      project.client.name.toLowerCase().includes(search) ||
      project.client.company?.toLowerCase().includes(search) ||
      project.description?.toLowerCase().includes(search)
    )
  })

  const handleSaveProject = async (
    data: { name: string; description: string | null; status: string; budget: string | number | null; startDate: string | null; endDate: string | null },
    files: File[],
    paymentPlan?: { numberOfInstallments: number; frequency: number }
  ) => {
    if (!selectedClient) return

    logger.debug('handleSaveProject called with paymentPlan:', paymentPlan)

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        clientId: selectedClient.id,
        paymentPlan
      }),
    })

    if (res.ok) {
      router.refresh()
      setIsProjectModalOpen(false)
      setSelectedClient(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filtres et bouton nouveau projet */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('projects.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full md:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('common.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('projects.allStatuses')}</SelectItem>
              <SelectItem value="active">{t('projects.active')}</SelectItem>
              <SelectItem value="completed">{t('projects.completed')}</SelectItem>
              <SelectItem value="onhold">{t('projects.onHold')}</SelectItem>
              <SelectItem value="cancelled">{t('projects.cancelled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bouton nouveau projet avec dropdown de clients */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="cursor-pointer">
              <Plus className="h-4 w-4 mr-2" />
              {t('projects.newProject')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>{t('projects.selectClient')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {clients.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                {t('projects.noClientsAvailable')}
              </div>
            ) : (
              clients.map((client) => (
                <DropdownMenuItem
                  key={client.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedClient(client)
                    setIsProjectModalOpen(true)
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{client.name}</span>
                    {client.company && (
                      <span className="text-xs text-muted-foreground">{client.company}</span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Grille de projets */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">
            {searchTerm || statusFilter !== 'all'
              ? t('projects.noProjectsFound')
              : t('projects.noProjects')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((project) => (
            <Link
              key={project.id}
              href={`/projets/${project.id}`}
              className="group"
            >
              <div className="bg-card rounded-lg border p-6 hover:shadow-lg transition-all duration-200 hover:border-primary/50 h-full flex flex-col">
                {/* En-tête */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors flex items-center gap-2">
                      {project.name}
                      <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {project.client.company || project.client.name}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      statusColors[project.status as keyof typeof statusColors]
                    }`}
                  >
                    {statusLabels[project.status as keyof typeof statusLabels]}
                  </span>
                </div>

                {/* Description */}
                {project.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}

                {/* Budget */}
                {project.budget && (
                  <p className="text-sm font-medium mb-4">
                    {t('projects.budget')}: {project.budget.toFixed(2)} $
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 mt-auto pt-4 border-t text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>{project._count.invoices}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Paperclip className="h-4 w-4" />
                    <span>{project._count.files}</span>
                  </div>
                </div>

                {/* Dates */}
                <div className="mt-2 text-xs text-muted-foreground">
                  {t('projects.createdOn')}{' '}
                  {new Date(project.createdAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal de création de projet */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false)
          setSelectedClient(null)
        }}
        onSave={handleSaveProject}
        project={null}
        clientName={selectedClient?.name}
      />
    </div>
  )
}
