'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useMemo, useEffect } from 'react'
import { Eye, Mail, CheckCircle, Trash2, Archive, ArrowUpDown, ArrowUp, ArrowDown, Link2, RefreshCw, MoreVertical, History } from 'lucide-react'
import { InvoiceViewModal } from '@/components/invoice-view-modal-edit'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { InvoiceCard } from '@/components/invoice-card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslation } from '@/lib/i18n-context'

type Invoice = {
  id: string
  number: string
  status: 'draft' | 'sent' | 'paid' | string
  subtotal: number
  tps: number
  tvq: number
  total: number
  createdAt: string | Date
  dueDate?: string | Date | null
  clientId: string
  client: { id: string; name: string | null; email?: string } | null
  project?: { id: string; name: string } | null
  items?: Array<{ id: string; description: string; amount: number; date: string | Date; dueDate?: string | Date | null }>
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-400/10 dark:text-gray-300',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-400/10 dark:text-blue-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-400/10 dark:text-green-300',
  archived: 'bg-slate-100 text-slate-800 dark:bg-slate-400/10 dark:text-slate-300',
}

// Status labels will be translated dynamically

type SortField = 'number' | 'client' | 'status' | 'total' | 'createdAt' | 'project'
type SortDirection = 'asc' | 'desc'

export function InvoicesTable({ invoices, showProject = false }: { invoices: Invoice[]; showProject?: boolean }) {
  const { t, locale } = useTranslation()
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  )
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([])
  const [batchAction, setBatchAction] = useState<'delete' | 'archive' | null>(null)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [isMobile, setIsMobile] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Auto-enable selection mode when first invoice is selected on mobile
  useEffect(() => {
    if (isMobile) {
      setIsSelectionMode(selectedInvoiceIds.length > 0)
    }
  }, [selectedInvoiceIds.length, isMobile])

  // Deterministic date formatting to avoid hydration mismatches (explicit locale + timezone)
  const formatDate = (d: string | Date) =>
    new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', { timeZone: 'UTC' }).format(new Date(d))

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />
  }

  const sortedInvoices = useMemo(() => {
    return [...invoices].sort((a, b) => {
      let compareResult = 0

      switch (sortField) {
        case 'number':
          compareResult = a.number.localeCompare(b.number)
          break
        case 'client':
          compareResult = (a.client?.name || '').localeCompare(b.client?.name || '')
          break
        case 'status':
          compareResult = a.status.localeCompare(b.status)
          break
        case 'total':
          compareResult = a.total - b.total
          break
        case 'createdAt':
          compareResult = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'project':
          compareResult = (a.project?.name || '').localeCompare(b.project?.name || '')
          break
      }

      return sortDirection === 'asc' ? compareResult : -compareResult
    })
  }, [invoices, sortField, sortDirection])

  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(invoiceId)
        ? prev.filter((id) => id !== invoiceId)
        : [...prev, invoiceId]
    )
  }

  const toggleSelectAll = () => {
    const invoiceIds = sortedInvoices.map((inv) => inv.id)
    const allSelected = invoiceIds.every((id) => selectedInvoiceIds.includes(id))

    if (allSelected) {
      setSelectedInvoiceIds([])
    } else {
      setSelectedInvoiceIds(invoiceIds)
    }
  }

  const doBatchAction = async (action: 'delete' | 'archive') => {
    if (selectedInvoiceIds.length === 0) return

    try {
      setBusyId('batch')

      if (action === 'delete') {
        await Promise.all(
          selectedInvoiceIds.map((id) =>
            fetch(`/api/invoices/${id}`, { method: 'DELETE' })
          )
        )
        setToast({
          type: 'success',
          message: `${selectedInvoiceIds.length} ${t('invoices.invoiceDeleted')}`,
        })
      } else if (action === 'archive') {
        await Promise.all(
          selectedInvoiceIds.map((id) =>
            fetch(`/api/invoices/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'archived' }),
            })
          )
        )
        setToast({
          type: 'success',
          message: `${selectedInvoiceIds.length} ${t('invoices.invoiceArchived')}`,
        })
      }

      setSelectedInvoiceIds([])
      setBatchAction(null)
      router.refresh()
    } catch {
      setToast({ type: 'error', message: t('common.actionError') })
    } finally {
      setBusyId(null)
      setTimeout(() => setToast(null), 2500)
    }
  }

  const doAction = async (
    invoiceId: string,
    kind: 'send' | 'paid' | 'delete',
  ) => {
    try {
      setBusyId(invoiceId)
      let url = ''
      let method = 'POST'
      let successMsg = ''

      if (kind === 'send') {
        url = '/api/invoices/send'
        successMsg = t('invoices.invoiceSent')
      } else if (kind === 'paid') {
        url = '/api/invoices/mark-paid'
        successMsg = t('invoices.invoicePaid')
      } else if (kind === 'delete') {
        url = `/api/invoices/${invoiceId}`
        method = 'DELETE'
        successMsg = t('invoices.invoiceDeleted')
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? JSON.stringify({ invoiceId }) : undefined,
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        const errorMessage = errorData.error || t('common.actionImpossible')
        setToast({ type: 'error', message: errorMessage })
        return
      }
      router.refresh()
      setToast({ type: 'success', message: successMsg })
      setDeleteConfirmId(null)
    } catch {
      setToast({ type: 'error', message: t('common.networkError') })
    } finally {
      setBusyId(null)
      setTimeout(() => setToast(null), 2500)
    }
  }

  const handleViewInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, { cache: 'no-store' })
      if (res.ok) {
        const full = await res.json()
        setSelectedInvoice(full)
        setPreviewOpen(true)
      }
    } catch {
      // ignore
    }
  }

  const handleCopyPaymentLink = (invoiceId: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const paymentUrl = `${baseUrl}/invoices/${invoiceId}/pay`

    navigator.clipboard.writeText(paymentUrl).then(() => {
      setToast({ type: 'success', message: t('invoices.paymentLinkCopied') })
      setTimeout(() => setToast(null), 2500)
    }).catch(() => {
      setToast({ type: 'error', message: t('common.copyError') })
      setTimeout(() => setToast(null), 2500)
    })
  }

  const invoiceIds = sortedInvoices.map((inv) => inv.id)
  const allSelected = invoiceIds.every((id) => selectedInvoiceIds.includes(id)) && sortedInvoices.length > 0

  return (
    <>
      {/* Bulk action buttons - Sticky on mobile, inline on desktop */}
      {selectedInvoiceIds.length > 0 && (
        <div className={`flex items-center gap-2 p-3 bg-muted/50 rounded-lg border ${
          isMobile
            ? 'sticky top-0 z-40 mb-4 shadow-md bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80'
            : 'mb-4'
        }`}>
          <span className="text-sm font-medium">
            {selectedInvoiceIds.length} {t('common.selected').toLowerCase()}
          </span>
          <div className="ml-auto flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedInvoiceIds([])}
              className="cursor-pointer"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBatchAction('archive')}
              disabled={busyId === 'batch'}
              className="cursor-pointer"
            >
              <Archive className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">{t('common.archive')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBatchAction('delete')}
              disabled={busyId === 'batch'}
              className="text-red-600 hover:text-red-700 dark:text-red-400 cursor-pointer"
            >
              <Trash2 className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">{t('common.delete')}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Mobile: Card view */}
      {isMobile ? (
        <div className="space-y-3">
          {sortedInvoices.map((inv) => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              isSelectionMode={isSelectionMode}
              isSelected={selectedInvoiceIds.includes(inv.id)}
              onToggleSelect={() => toggleInvoiceSelection(inv.id)}
              onView={() => handleViewInvoice(inv.id)}
              onSend={() => doAction(inv.id, 'send')}
              onMarkPaid={() => doAction(inv.id, 'paid')}
              onDelete={() => setDeleteConfirmId(inv.id)}
              onCopyLink={() => handleCopyPaymentLink(inv.id)}
              onResend={() => doAction(inv.id, 'send')}
              isBusy={busyId === inv.id}
            />
          ))}
        </div>
      ) : (
        /* Desktop: Table view */
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
            <tr>
              <th className="text-left py-3 px-4 w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('number')}
                  className="flex items-center hover:text-foreground/80 transition-colors"
                >
                  {t('invoices.invoiceNumber')}
                  <SortIcon field="number" />
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('client')}
                  className="flex items-center hover:text-foreground/80 transition-colors"
                >
                  {t('invoices.client')}
                  <SortIcon field="client" />
                </button>
              </th>
              {showProject && (
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('project')}
                    className="flex items-center hover:text-foreground/80 transition-colors"
                  >
                    {t('projects.title')}
                    <SortIcon field="project" />
                  </button>
                </th>
              )}
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center hover:text-foreground/80 transition-colors"
                >
                  {t('invoices.status')}
                  <SortIcon field="status" />
                </button>
              </th>
              <th className="text-right py-3 px-4">
                <button
                  onClick={() => handleSort('total')}
                  className="flex items-center hover:text-foreground/80 transition-colors ml-auto"
                >
                  {t('invoices.total')}
                  <SortIcon field="total" />
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center hover:text-foreground/80 transition-colors"
                >
                  {t('invoices.date')}
                  <SortIcon field="createdAt" />
                </button>
              </th>
              <th className="text-right py-3 px-4">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedInvoices.map((inv) => (
              <tr key={inv.id} className="border-t">
                <td className="py-3 px-4">
                  <Checkbox
                    checked={selectedInvoiceIds.includes(inv.id)}
                    onCheckedChange={() => toggleInvoiceSelection(inv.id)}
                  />
                </td>
                <td className="py-3 px-4 font-medium">
                  {inv.number}
                </td>
                <td className="py-3 px-4">
                  <Link href={`/clients/${inv.clientId}`} className="underline">
                    {inv.client?.name ?? t('invoices.client')}
                  </Link>
                </td>
                {showProject && (
                  <td className="py-3 px-4">
                    {inv.project ? (
                      <Link
                        href={`/clients/${inv.clientId}?tab=projects`}
                        className="underline"
                      >
                        {inv.project.name}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </td>
                )}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                        statusColors[inv.status as keyof typeof statusColors] || statusColors.draft
                      }`}
                    >
                      {inv.status === 'draft' && t('invoices.draft')}
                      {inv.status === 'sent' && t('invoices.sent')}
                      {inv.status === 'paid' && t('invoices.paid')}
                      {inv.status === 'archived' && t('common.archive')}
                      {!['draft', 'sent', 'paid', 'archived'].includes(inv.status) && inv.status}
                    </span>
                    {inv.status === 'sent' && inv.dueDate && new Date(inv.dueDate) < new Date() && (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-400/10 dark:text-red-300">
                        ⚠️ {t('invoices.overdue')}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-semibold">{Number(inv.total).toFixed(2)} $</td>
                <td className="py-3 px-4">{formatDate(inv.createdAt)}</td>
                <td className="py-3 px-4">
                  <div className="flex justify-end gap-1">
                    {/* Voir - toujours visible */}
                    <Tooltip content={t('invoices.viewInvoice')}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          ;(async () => {
                            try {
                              const res = await fetch(`/api/invoices/${inv.id}`, { cache: 'no-store' })
                              if (res.ok) {
                                const full = await res.json()
                                setSelectedInvoice(full)
                                setPreviewOpen(true)
                              }
                            } catch {
                              // ignore
                            }
                          })()
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Tooltip>

                    {/* Action contextuelle selon le statut */}
                    {inv.status === 'draft' && inv.client?.email && (
                      <Tooltip content={t('invoices.sendInvoice')}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={busyId === inv.id}
                          onClick={() => doAction(inv.id, 'send')}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                    )}

                    {inv.status === 'sent' && (
                      <Tooltip content={t('invoices.markAsPaid')}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 dark:text-green-400"
                          disabled={busyId === inv.id}
                          onClick={() => doAction(inv.id, 'paid')}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                    )}

                    {/* Menu dropdown pour actions secondaires */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* Renvoyer (si sent) */}
                        {inv.status === 'sent' && inv.client?.email && (
                          <DropdownMenuItem
                            onClick={() => doAction(inv.id, 'send')}
                            disabled={busyId === inv.id}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {t('invoices.sendInvoice')}
                          </DropdownMenuItem>
                        )}

                        {/* Voir les rappels */}
                        <DropdownMenuItem asChild>
                          <Link href={`/factures/${inv.id}/rappels`}>
                            <History className="h-4 w-4 mr-2" />
                            {t('invoices.viewReminders')}
                          </Link>
                        </DropdownMenuItem>

                        {/* Copier lien (si non-draft) */}
                        {inv.status !== 'draft' && (
                          <DropdownMenuItem
                            onClick={() => handleCopyPaymentLink(inv.id)}
                          >
                            <Link2 className="h-4 w-4 mr-2" />
                            {t('invoices.copyPaymentLink')}
                          </DropdownMenuItem>
                        )}

                        {/* Marquer payée (si non-paid) */}
                        {inv.status !== 'paid' && (
                          <DropdownMenuItem
                            onClick={() => doAction(inv.id, 'paid')}
                            disabled={busyId === inv.id}
                          >
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            {t('invoices.markAsPaid')}
                          </DropdownMenuItem>
                        )}

                        {/* Supprimer (toujours) */}
                        <DropdownMenuItem
                          onClick={() => setDeleteConfirmId(inv.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      <InvoiceViewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        invoice={selectedInvoice}
      />
      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) {
            doAction(deleteConfirmId, 'delete')
          }
        }}
        title={t('invoices.deleteInvoice')}
        description={t('invoices.deleteConfirm')}
        confirmText={t('common.delete')}
        isLoading={busyId === deleteConfirmId}
      />
      <ConfirmDialog
        isOpen={batchAction === 'delete'}
        onClose={() => setBatchAction(null)}
        onConfirm={() => doBatchAction('delete')}
        title={t('invoices.deleteInvoice')}
        description={t('invoices.deleteConfirm')}
        confirmText={t('common.delete')}
        isLoading={busyId === 'batch'}
      />
      <ConfirmDialog
        isOpen={batchAction === 'archive'}
        onClose={() => setBatchAction(null)}
        onConfirm={() => doBatchAction('archive')}
        title={t('common.archive')}
        description={`${t('invoices.deleteConfirm')}`}
        confirmText={t('common.archive')}
        isLoading={busyId === 'batch'}
      />
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-md border px-3 py-2 text-sm shadow-md ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-400/10 dark:text-green-300 dark:border-green-300/20'
              : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-400/10 dark:text-red-300 dark:border-red-300/20'
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  )
}
