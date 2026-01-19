'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, Send, Bug, Sparkles, Lightbulb, MessageCircle, Shield } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n-context'
import { logger } from '@/lib/logger'

interface FeedbackDetailsModalProps {
  feedbackId: string
  isOpen: boolean
  onClose: () => void
  isSuperAdmin?: boolean
}

interface FeedbackUser {
  id: string
  name: string | null
  email: string | null
}

interface FeedbackMessage {
  id: string
  feedbackId: string
  authorId: string
  authorType: string
  message: string
  createdAt: string
  author: FeedbackUser
}

interface Feedback {
  id: string
  type: string
  severity: string
  title: string
  message: string
  screenshot: string | null
  pageUrl: string
  pageTitle: string | null
  userAgent: string | null
  screenSize: string | null
  deviceType: string | null
  userId: string | null
  isAnonymous: boolean
  status: string
  priority: string
  adminNote: string | null
  linkedIssue: string | null
  createdAt: string
  viewedAt: string | null
  resolvedAt: string | null
  user: FeedbackUser | null
  messages: FeedbackMessage[]
}

const typeIcons: Record<string, typeof Bug> = {
  bug: Bug,
  feature: Sparkles,
  improvement: Lightbulb,
  other: MessageCircle,
}

const severityColors: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-500',
  in_progress: 'bg-purple-500',
  resolved: 'bg-green-500',
  closed: 'bg-gray-500',
}

export function FeedbackDetailsModal({
  feedbackId,
  isOpen,
  onClose,
  isSuperAdmin = false,
}: FeedbackDetailsModalProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [linkedIssue, setLinkedIssue] = useState('')
  const [resolving, setResolving] = useState(false)

  const router = useRouter()
  const { t } = useTranslation()

  // Helper functions for translated labels
  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      critical: t('feedback.critical'),
      high: t('feedback.high'),
      medium: t('feedback.medium'),
      low: t('feedback.low'),
    }
    return labels[severity] || severity
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: t('feedback.new'),
      in_progress: t('feedback.inProgress'),
      resolved: t('feedback.resolved'),
      closed: t('feedback.closed'),
    }
    return labels[status] || status
  }

  const priorityLevels = [
    { value: 'critical', label: t('feedback.critical') },
    { value: 'high', label: t('feedback.high') },
    { value: 'medium', label: t('feedback.medium') },
    { value: 'low', label: t('feedback.low') },
  ]

  const statusOptions = [
    { value: 'new', label: t('feedback.new') },
    { value: 'in_progress', label: t('feedback.inProgress') },
    { value: 'resolved', label: t('feedback.resolved') },
    { value: 'closed', label: t('feedback.closed') },
  ]

  const loadFeedback = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/feedback/${feedbackId}`)
      if (res.ok) {
        const data = await res.json()
        setFeedback(data)
        setStatus(data.status)
        setPriority(data.priority)
        setAdminNote(data.adminNote || '')
        setLinkedIssue(data.linkedIssue || '')
      }
    } catch (error) {
      logger.error('Error loading feedback:', error)
    } finally {
      setLoading(false)
    }
  }, [feedbackId])

  useEffect(() => {
    if (isOpen && feedbackId) {
      loadFeedback()
    }
  }, [isOpen, feedbackId, loadFeedback])

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    setSending(true)
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() }),
      })

      if (res.ok) {
        setNewMessage('')
        await loadFeedback()
        router.refresh()
      }
    } catch (error) {
      logger.error('Error sending message:', error)
      alert(t('feedback.sendError'))
    } finally {
      setSending(false)
    }
  }

  const handleUpdate = async () => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          priority,
          adminNote: adminNote.trim() || null,
          linkedIssue: linkedIssue.trim() || null,
        }),
      })

      if (res.ok) {
        await loadFeedback()
        router.refresh()
        alert(t('success.updated'))
      }
    } catch (error) {
      logger.error('Error updating feedback:', error)
      alert(t('admin.updateError'))
    } finally {
      setUpdating(false)
    }
  }

  const handleMarkResolved = async () => {
    setResolving(true)
    try {
      const res = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'resolved',
          priority,
          adminNote: adminNote.trim() || null,
          linkedIssue: linkedIssue.trim() || null,
        }),
      })

      if (res.ok) {
        await loadFeedback()
        router.refresh()
        alert(t('success.updated'))
      }
    } catch (error) {
      logger.error('Error marking as resolved:', error)
      alert(t('admin.updateError'))
    } finally {
      setResolving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-4xl bg-background rounded-lg shadow-2xl z-50 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {feedback && (() => {
              const Icon = typeIcons[feedback.type] || MessageCircle
              return <Icon className="h-6 w-6 text-primary" />
            })()}
            <div>
              <h2 className="text-xl font-semibold">
                {loading ? t('common.loading') : feedback?.title}
              </h2>
              {!loading && feedback && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={severityColors[feedback.severity]}>
                    {getSeverityLabel(feedback.severity)}
                  </Badge>
                  {!feedback.viewedAt && (
                    <Badge className="bg-blue-500">
                      {t('feedback.new')}
                    </Badge>
                  )}
                  {feedback.viewedAt && feedback.status !== 'new' && (
                    <Badge className={statusColors[feedback.status]}>
                      {getStatusLabel(feedback.status)}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin && feedback && feedback.status !== 'resolved' && feedback.status !== 'closed' && (
              <Button
                variant="default"
                size="sm"
                onClick={handleMarkResolved}
                disabled={resolving}
                className="bg-green-600 hover:bg-green-700"
              >
                {resolving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common.processing')}
                  </>
                ) : (
                  `✓ ${t('admin.markAsResolved')}`
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !feedback ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">{t('admin.noFeedback')}</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Infos générales */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                  {t('common.info')}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('admin.author')}:</span>{' '}
                    <span className="font-medium">
                      {feedback.isAnonymous
                        ? t('admin.anonymous')
                        : feedback.user?.name || feedback.user?.email || t('admin.anonymous')}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('common.date')}:</span>{' '}
                    <span className="font-medium">
                      {new Date(feedback.createdAt).toLocaleString('fr-CA')}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('feedback.currentPage')}:</span>{' '}
                    <span className="font-medium">{feedback.pageUrl}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('feedback.browser')}:</span>{' '}
                    <span className="font-medium">
                      {feedback.deviceType || t('common.none')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Message principal */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                  {t('common.description')}
                </h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="whitespace-pre-wrap">{feedback.message}</p>
                </div>
              </div>

              {/* Screenshot */}
              {feedback.screenshot && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                    {t('feedback.screenshot')}
                  </h3>
                  <div className="relative w-full h-80">
                    <Image
                      src={feedback.screenshot}
                      alt="Screenshot"
                      fill
                      className="rounded-lg border object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Admin controls */}
              {isSuperAdmin && (
                <div className="space-y-4 border-t pt-6">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                    {t('admin.systemSettings')}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">{t('common.status')}</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">{t('feedback.severity')}</Label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger id="priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priorityLevels.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedIssue">Issue GitHub ({t('common.optional')})</Label>
                    <input
                      id="linkedIssue"
                      type="text"
                      value={linkedIssue}
                      onChange={(e) => setLinkedIssue(e.target.value)}
                      placeholder="https://github.com/..."
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminNote">{t('common.notes')} ({t('common.optional')})</Label>
                    <Textarea
                      id="adminNote"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder={t('common.notes')}
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={handleUpdate}
                    disabled={updating}
                    className="w-full"
                  >
                    {updating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('common.processing')}
                      </>
                    ) : (
                      t('common.update')
                    )}
                  </Button>
                </div>
              )}

              {/* Messages */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                  {t('feedback.messages')} ({feedback.messages?.length || 0})
                </h3>

                {/* Messages list */}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {feedback.messages?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t('feedback.noMessages')}
                    </p>
                  ) : (
                    feedback.messages?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.authorType === 'admin'
                            ? 'bg-primary/10 ml-8'
                            : 'bg-muted mr-8'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium flex items-center gap-1">
                            {msg.authorType === 'admin' && <Shield className="h-3 w-3" />}
                            {msg.authorType === 'admin' ? t('nav.admin') : msg.author?.name || t('admin.anonymous')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleString('fr-CA')}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* New message */}
                {feedback.status !== 'closed' ? (
                  <div className="space-y-2">
                    <Label htmlFor="newMessage">{t('feedback.writeMessage')}</Label>
                    <Textarea
                      id="newMessage"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={t('feedback.reply')}
                      rows={2}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={sending || !newMessage.trim()}
                      className="w-full sm:w-auto sm:ml-auto sm:flex"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t('feedback.sending')}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          {t('feedback.send')}
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                    {isSuperAdmin
                      ? t('feedback.cannotSendMessage')
                      : t('feedback.cannotSendMessage')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
