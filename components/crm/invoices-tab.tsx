'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, Mail, CheckCircle, Trash2, Archive, MoreVertical, Link2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { InvoiceViewModal } from '@/components/invoice-view-modal-edit'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { InvoiceCard } from '@/components/invoice-card'
import { useTranslation } from '@/lib/i18n-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Invoice = {
  id: string
  number: string
  status: string
  subtotal: number
  tps: number
  tvq: number
  total: number
  createdAt: Date
  dueDate: Date | null
  project: {
    id: string
    name: string
  } | null
}

type InvoiceForView = Invoice & {
  client: {
    id: string
    name: string | null
    company?: string | null
    email?: string | null
    address?: string | null
  } | null
}

type ClientWithInvoices = {
  id: string
  name: string
  invoices: Invoice[]
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-400/10 dark:text-gray-300',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-400/10 dark:text-blue-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-400/10 dark:text-green-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-400/10 dark:text-red-300',
}

// Helper to check if invoice is overdue
const isOverdue = (invoice: Invoice) => {
  if (invoice.status !== 'sent' || !invoice.dueDate) return false
  return new Date(invoice.dueDate) < new Date()
}

// Status labels will be dynamically translated using i18n hook

export function InvoicesTab({
  client,
  showArchived,
  setShowArchived,
}: {
  client: ClientWithInvoices
  showArchived?: boolean
  setShowArchived?: (show: boolean) => void
}) {
  const router = useRouter()
  const { t, locale } = useTranslation()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceForView | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([])
  const [batchAction, setBatchAction] = useState<'delete' | 'archive' | null>(
    null
  )
  const [internalShowArchived, setInternalShowArchived] = useState(false)
  const archiveSectionRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  // Use external state if provided, otherwise use internal state
  const isArchived = showArchived ?? internalShowArchived
  const toggleArchived = setShowArchived ?? setInternalShowArchived

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

  // Scroll to archives section when it opens
  useEffect(() => {
    if (isArchived && archiveSectionRef.current) {
      // Wait for animation to complete (500ms animation duration)
      setTimeout(() => {
        archiveSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        })
      }, 600)
    }
  }, [isArchived])

  // Séparer les factures de projets, ponctuelles et archivées
  const projectInvoices = client.invoices.filter(
    (inv) => inv.project !== null && inv.status !== 'archived'
  )
  const punctualInvoices = client.invoices.filter(
    (inv) => inv.project === null && inv.status !== 'archived'
  )
  const archivedInvoices = client.invoices.filter(
    (inv) => inv.status === 'archived'
  )

  // Ne compter que les factures payées
  const totalInvoiced = client.invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0)
  const totalPaid = client.invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0)
  const totalPending = totalInvoiced - totalPaid

  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(invoiceId)
        ? prev.filter((id) => id !== invoiceId)
        : [...prev, invoiceId]
    )
  }

  const toggleSelectAll = (invoices: Invoice[]) => {
    const invoiceIds = invoices.map((inv) => inv.id)
    const allSelected = invoiceIds.every((id) =>
      selectedInvoiceIds.includes(id)
    )

    if (allSelected) {
      setSelectedInvoiceIds((prev) =>
        prev.filter((id) => !invoiceIds.includes(id))
      )
    } else {
      setSelectedInvoiceIds((prev) => [...new Set([...prev, ...invoiceIds])])
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
          message: t('crm.invoices.invoicesDeleted'),
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
          message: t('crm.invoices.invoicesArchived'),
        })
      }

      setSelectedInvoiceIds([])
      setBatchAction(null)
      router.refresh()
    } catch {
      setToast({ type: 'error', message: t('crm.invoices.batchActionError') })
    } finally {
      setBusyId(null)
      setTimeout(() => setToast(null), 2500)
    }
  }

  const doAction = async (
    invoiceId: string,
    kind: 'send' | 'paid' | 'delete' | 'unarchive'
  ) => {
    try {
      setBusyId(invoiceId)
      let url = ''
      let method = 'POST'
      let successMsg = ''

      if (kind === 'send') {
        url = '/api/invoices/send'
        successMsg = t('crm.invoices.invoiceSent')
      } else if (kind === 'paid') {
        url = '/api/invoices/mark-paid'
        successMsg = t('crm.invoices.invoicePaid')
      } else if (kind === 'unarchive') {
        url = `/api/invoices/${invoiceId}`
        method = 'PATCH'
        successMsg = t('crm.invoices.invoiceUnarchived')
      } else if (kind === 'delete') {
        url = `/api/invoices/${invoiceId}`
        method = 'DELETE'
        successMsg = t('crm.invoices.invoiceDeleted')
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:
          method === 'POST'
            ? JSON.stringify({ invoiceId })
            : method === 'PATCH'
              ? JSON.stringify({ status: 'draft' })
              : undefined,
      })
      if (!res.ok) {
        setToast({ type: 'error', message: t('crm.invoices.actionError') })
        return
      }
      router.refresh()
      setToast({ type: 'success', message: successMsg })
      setDeleteConfirmId(null)
    } catch {
      setToast({ type: 'error', message: t('crm.invoices.networkError') })
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
      setToast({ type: 'success', message: t('crm.invoices.paymentLinkCopied') })
      setTimeout(() => setToast(null), 2500)
    }).catch(() => {
      setToast({ type: 'error', message: t('crm.invoices.copyError') })
      setTimeout(() => setToast(null), 2500)
    })
  }

  const renderInvoiceTable = (
    invoices: Invoice[],
    emptyMessage: string,
    isArchivedSection = false
  ) => {
    if (invoices.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">{emptyMessage}</p>
        </div>
      )
    }

    const invoiceIds = invoices.map((inv) => inv.id)
    const allSelected = invoiceIds.every((id) =>
      selectedInvoiceIds.includes(id)
    )
    const selectedFromThisTable = invoiceIds.filter((id) =>
      selectedInvoiceIds.includes(id)
    )

    // Convertir Invoice en type compatible avec InvoiceCard
    const invoicesWithClient = invoices.map(inv => ({
      ...inv,
      clientId: client.id,
      client: {
        id: client.id,
        name: client.name,
        email: undefined
      },
      items: []
    }))

    return (
      <div className="space-y-3">
        {/* Batch Actions Bar - Sticky on mobile, inline on desktop */}
        {selectedFromThisTable.length > 0 && (
          <div className={`flex items-center gap-2 p-3 rounded-lg border ${
            isMobile
              ? 'sticky top-0 z-40 bg-primary/10 border-primary/20 shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/80'
              : 'bg-primary/10 border-primary/20'
          }`}>
            <span className="text-sm font-medium">
              {selectedFromThisTable.length} {t('crm.invoices.selectedCount')}
            </span>
            <div className="ml-auto flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedInvoiceIds((prev) =>
                    prev.filter((id) => !invoiceIds.includes(id))
                  )
                }}
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
                <span className="hidden md:inline">{t('crm.invoices.archiveSelected')}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBatchAction('delete')}
                disabled={busyId === 'batch'}
                className="text-red-600 hover:text-red-700 dark:text-red-400 cursor-pointer"
              >
                <Trash2 className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">{t('crm.invoices.deleteSelected')}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Mobile: Card view */}
        {isMobile ? (
          <div className="space-y-3">
            {invoicesWithClient.map((inv) => (
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => toggleSelectAll(invoices)}
                      aria-label={t('crm.invoices.selectAll')}
                    />
                  </th>
                  <th className="text-left p-3 font-medium">{t('crm.invoices.number')}</th>
                  {invoices === projectInvoices && (
                    <th className="text-left p-3 font-medium">{t('crm.invoices.project')}</th>
                  )}
                  <th className="text-left p-3 font-medium">{t('crm.invoices.date')}</th>
                  <th className="text-left p-3 font-medium">{t('crm.invoices.amount')}</th>
                  <th className="text-left p-3 font-medium">{t('crm.invoices.status')}</th>
                  <th className="text-right p-3 font-medium">{t('crm.invoices.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-t hover:bg-muted/50"
                  >
                    <td className="p-3">
                      <Checkbox
                        checked={selectedInvoiceIds.includes(invoice.id)}
                        onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                        aria-label={t('crm.invoices.select')}
                      />
                    </td>
                    <td className="p-3 font-medium">{invoice.number}</td>
                    {invoices === projectInvoices && (
                      <td className="p-3">
                        <span className="text-sm">{invoice.project?.name}</span>
                      </td>
                    )}
                    <td className="p-3 text-sm text-muted-foreground">
                      {new Date(invoice.createdAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')}
                    </td>
                    <td className="p-3 font-medium">
                      {invoice.total.toFixed(2)} $
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          isOverdue(invoice)
                            ? statusColors.overdue
                            : statusColors[invoice.status as keyof typeof statusColors] || statusColors.draft
                        }`}
                      >
                        {invoice.status === 'draft' && t('invoices.draft')}
                        {invoice.status === 'sent' && (isOverdue(invoice) ? t('invoices.overdue') : t('invoices.sent'))}
                        {invoice.status === 'paid' && t('invoices.paid')}
                        {!['draft', 'sent', 'paid'].includes(invoice.status) && invoice.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        {/* Voir (toujours visible) */}
                        <Tooltip content={t('crm.invoices.viewAndEdit')}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleViewInvoice(invoice.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Tooltip>

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
                            {/* Désarchiver (seulement pour les factures archivées) */}
                            {isArchivedSection && (
                              <DropdownMenuItem
                                onClick={() => doAction(invoice.id, 'unarchive')}
                                disabled={busyId === invoice.id}
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                {t('crm.invoices.unarchive')}
                              </DropdownMenuItem>
                            )}

                            {/* Envoyer par email (si draft) */}
                            {!isArchivedSection && invoice.status === 'draft' && (
                              <DropdownMenuItem
                                onClick={() => doAction(invoice.id, 'send')}
                                disabled={busyId === invoice.id}
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                {t('crm.invoices.sendByEmail')}
                              </DropdownMenuItem>
                            )}

                            {/* Renvoyer (si sent) */}
                            {!isArchivedSection && invoice.status === 'sent' && (
                              <DropdownMenuItem
                                onClick={() => doAction(invoice.id, 'send')}
                                disabled={busyId === invoice.id}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {t('crm.invoices.resend')}
                              </DropdownMenuItem>
                            )}

                            {/* Copier lien de paiement (si non-draft) */}
                            {!isArchivedSection && invoice.status !== 'draft' && (
                              <DropdownMenuItem
                                onClick={() => handleCopyPaymentLink(invoice.id)}
                              >
                                <Link2 className="h-4 w-4 mr-2" />
                                {t('crm.invoices.copyPaymentLink')}
                              </DropdownMenuItem>
                            )}

                            {/* Marquer payée (si non-paid) */}
                            {!isArchivedSection && invoice.status !== 'paid' && (
                              <DropdownMenuItem
                                onClick={() => doAction(invoice.id, 'paid')}
                                disabled={busyId === invoice.id}
                              >
                                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                {t('crm.invoices.markAsPaid')}
                              </DropdownMenuItem>
                            )}

                            {/* Supprimer (toujours) */}
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirmId(invoice.id)}
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
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground mb-1">{t('crm.invoices.totalInvoiced')}</p>
            <p className="text-2xl font-bold">{totalInvoiced.toFixed(2)} $</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground mb-1">{t('crm.invoices.totalPaid')}</p>
            <p className="text-2xl font-bold text-green-600">
              {totalPaid.toFixed(2)} $
            </p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground mb-1">{t('crm.invoices.pending')}</p>
            <p className="text-2xl font-bold text-amber-600">
              {totalPending.toFixed(2)} $
            </p>
          </div>
        </div>

        {/* Factures de projets */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">{t('crm.invoices.projectInvoices')}</h3>
          <div className="bg-card rounded-lg border overflow-hidden">
            {renderInvoiceTable(
              projectInvoices,
              t('crm.invoices.noProjectInvoices')
            )}
          </div>
        </div>

        {/* Factures ponctuelles */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">{t('crm.invoices.punctualInvoices')}</h3>
          <div className="bg-card rounded-lg border overflow-hidden">
            {renderInvoiceTable(
              punctualInvoices,
              t('crm.invoices.noPunctualInvoices')
            )}
          </div>
        </div>

        {/* Bouton archives */}
        {archivedInvoices.length > 0 && (
          <div className="flex justify-center py-4">
            <Button
              variant="outline"
              onClick={() => toggleArchived(!isArchived)}
              className="cursor-pointer"
            >
              <Archive className="h-4 w-4 mr-2" />
              {isArchived
                ? t('crm.invoices.hideArchives')
                : `${t('crm.invoices.showArchives')} (${archivedInvoices.length})`}
            </Button>
          </div>
        )}
      </div>

      {/* Section archives avec animation */}
      <motion.div
        ref={archiveSectionRef}
        initial={{ height: 0 }}
        animate={{ height: isArchived ? 'auto' : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="space-y-3 pt-6">
          <h3 className="text-lg font-semibold">{t('crm.invoices.archivedInvoices')}</h3>
          <div className="bg-card rounded-lg border overflow-hidden">
            {renderInvoiceTable(
              archivedInvoices,
              t('crm.invoices.noArchivedInvoices'),
              true
            )}
          </div>
        </div>
      </motion.div>

      {/* Modals */}
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
        title={t('crm.invoices.deleteInvoiceTitle')}
        description={t('crm.invoices.deleteInvoiceDescription')}
        confirmText={t('common.delete')}
        isLoading={busyId === deleteConfirmId}
      />
      <ConfirmDialog
        isOpen={batchAction !== null}
        onClose={() => setBatchAction(null)}
        onConfirm={() => {
          if (batchAction) {
            doBatchAction(batchAction)
          }
        }}
        title={
          batchAction === 'delete'
            ? `${t('crm.invoices.deleteMultipleTitle')} ${selectedInvoiceIds.length} ${t('crm.invoices.selectedCount')}`
            : `${t('crm.invoices.archiveMultipleTitle')} ${selectedInvoiceIds.length} ${t('crm.invoices.selectedCount')}`
        }
        description={
          batchAction === 'delete'
            ? `${t('crm.invoices.deleteMultipleDescription')} ${selectedInvoiceIds.length} ${t('crm.invoices.selectedCount')} ? ${t('crm.invoices.irrevocableAction')}`
            : `${t('crm.invoices.archiveMultipleDescription')} ${selectedInvoiceIds.length} ${t('crm.invoices.selectedCount')} ?`
        }
        confirmText={batchAction === 'delete' ? t('common.delete') : t('common.archive')}
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
