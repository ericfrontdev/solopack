'use client'

import { useState, useEffect } from 'react'
import {
  X,
  MessageSquare,
  Loader2,
  Bug,
  Sparkles,
  Lightbulb,
  MessageCircle,
} from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useImageUpload } from '@/lib/upload-image'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n-context'
import { logger } from '@/lib/logger'

export function FeedbackWidget() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true)
  const [type, setType] = useState('bug')
  const [severity, setSeverity] = useState('medium')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const { upload, uploading } = useImageUpload()
  const router = useRouter()

  const feedbackTypes = [
    { value: 'bug', label: t('feedback.bug'), icon: Bug },
    { value: 'feature', label: t('feedback.feature'), icon: Sparkles },
    { value: 'improvement', label: t('feedback.improvement'), icon: Lightbulb },
    { value: 'other', label: t('feedback.other'), icon: MessageCircle },
  ]

  const severityLevels = [
    {
      value: 'critical',
      label: t('feedback.critical'),
      description: t('feedback.criticalDescription'),
    },
    { value: 'high', label: t('feedback.high'), description: t('feedback.highDescription') },
    { value: 'medium', label: t('feedback.medium'), description: t('feedback.mediumDescription') },
    { value: 'low', label: t('feedback.low'), description: t('feedback.lowDescription') },
  ]

  // Check if feedback system is enabled
  useEffect(() => {
    const checkEnabled = async () => {
      try {
        const res = await fetch('/api/admin/settings')
        if (res.ok) {
          const settings = await res.json()
          setIsEnabled(settings.feedbackSystemEnabled)
        }
      } catch (error) {
        // Si erreur, on suppose que c'est désactivé
        setIsEnabled(false)
      }
    }
    checkEnabled()
  }, [])

  const handleScreenshotChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Upload immédiatement
    const result = await upload(file)
    if (result) {
      setScreenshotUrl(result.url)
    }
  }

  const captureContext = () => {
    return {
      pageUrl: window.location.href,
      pageTitle: document.title,
      userAgent: navigator.userAgent,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      deviceType:
        window.innerWidth < 768
          ? 'mobile'
          : window.innerWidth < 1024
            ? 'tablet'
            : 'desktop',
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !message.trim()) {
      return
    }

    setSubmitting(true)

    try {
      const context = captureContext()

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          severity,
          title: title.trim(),
          message: message.trim(),
          screenshot: screenshotUrl,
          isAnonymous,
          ...context,
        }),
      })

      if (!res.ok) {
        throw new Error(t('feedback.sendError'))
      }

      // Success!
      setSuccess(true)

      // Reset form after 2s
      setTimeout(() => {
        setIsOpen(false)
        setType('bug')
        setSeverity('medium')
        setTitle('')
        setMessage('')
        setIsAnonymous(false)
        setScreenshotUrl(null)
        setSuccess(false)
      }, 2000)

      // Refresh router cache
      router.refresh()
    } catch (error) {
      logger.error('Error submitting feedback:', error)
      alert(t('feedback.feedbackError'))
    } finally {
      setSubmitting(false)
    }
  }

  // Ne rien afficher si désactivé
  if (!isEnabled) {
    return null
  }

  return (
    <>
      {/* Spacer pour éviter que le contenu soit caché par le bouton mobile */}
      {!isOpen && <div className="md:hidden h-14" />}

      {/* Tab flottante - Desktop */}
      {!isOpen && (
        <>
          {/* Version desktop - bouton vertical sur le côté */}
          <button
            onClick={() => setIsOpen(true)}
            className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-2 py-6 rounded-l-lg shadow-lg hover:bg-primary/90 transition-all z-50 items-center gap-2 font-medium"
            style={{ writingMode: 'vertical-rl' }}
          >
            <MessageSquare
              className="h-5 w-5"
              style={{ writingMode: 'horizontal-tb' }}
            />
            <span>{t('feedback.title')}</span>
          </button>

          {/* Version mobile - bannière sticky en bas */}
          <button
            onClick={() => setIsOpen(true)}
            className="md:hidden fixed bottom-0 left-0 right-0 bg-primary text-primary-foreground px-4 py-3 shadow-lg hover:bg-primary/90 transition-all z-50 flex items-center justify-center gap-2 font-medium"
          >
            <MessageSquare className="h-5 w-5" />
            <span>{t('feedback.submitFeedback')}</span>
          </button>
        </>
      )}

      {/* Drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer content */}
          <div className="fixed right-0 top-0 bottom-0 w-full md:w-[450px] bg-background shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
            {/* Header */}
            <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-semibold">
                  💬 {t('feedback.submitFeedback')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('feedback.helpImprove')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Success message */}
            {success && (
              <div className="mx-6 mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-200 font-medium text-center">
                  ✅ {t('feedback.thankYou')}
                </p>
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-6"
            >
              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type">{t('feedback.feedbackType')} *</Label>
                <Select
                  value={type}
                  onValueChange={setType}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {feedbackTypes.map((t) => (
                      <SelectItem
                        key={t.value}
                        value={t.value}
                      >
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Severity */}
              <div className="space-y-2">
                <Label htmlFor="severity">{t('feedback.severity')} *</Label>
                <Select
                  value={severity}
                  onValueChange={setSeverity}
                >
                  <SelectTrigger id="severity" className="!py-3 h-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="py-2">
                    {severityLevels.map((s) => (
                      <SelectItem
                        key={s.value}
                        value={s.value}
                      >
                        <div className="text-left">
                          <div>{s.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">{t('feedback.subject')} *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('feedback.subjectPlaceholder')}
                  maxLength={100}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {title.length}/100 {t('feedback.characters')}
                </p>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">{t('feedback.description')} *</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('feedback.descriptionPlaceholder')}
                  rows={5}
                  required
                />
              </div>

              {/* Screenshot */}
              <div className="space-y-2">
                <Label htmlFor="screenshot">
                  {t('feedback.screenshot')}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="screenshot"
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                {screenshotUrl && (
                  <div className="mt-2 relative w-full h-40">
                    <Image
                      src={screenshotUrl}
                      alt="Screenshot preview"
                      fill
                      className="rounded-lg border object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotUrl(null)
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Anonymous */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={(checked) =>
                    setIsAnonymous(checked as boolean)
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="anonymous"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {t('feedback.sendAnonymously')}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {t('feedback.anonymousDescription')}
                  </p>
                </div>
              </div>

              {/* Context info */}
              <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">
                  {t('feedback.autoCapturedInfo')}
                </p>
                <p>
                  • {t('feedback.currentPage')}:{' '}
                  {typeof window !== 'undefined'
                    ? window.location.pathname
                    : ''}
                </p>
                <p>
                  • {t('feedback.browser')}:{' '}
                  {typeof window !== 'undefined'
                    ? navigator.userAgent.split(' ').slice(-2).join(' ')
                    : ''}
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                  disabled={submitting}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={submitting || !title.trim() || !message.trim()}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('feedback.sending')}
                    </>
                  ) : (
                    t('common.send')
                  )}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  )
}
