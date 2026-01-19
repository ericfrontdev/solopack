'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, Save } from 'lucide-react'
import { useTranslation } from '@/lib/i18n-context'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

type Settings = {
  id: string
  feedbackSystemEnabled: boolean
  betaEnabled: boolean
  betaEndDate: Date | null
  maxBetaUsers: number
  updatedAt: Date
  updatedBy: string | null
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [feedbackEnabled, setFeedbackEnabled] = useState(settings.feedbackSystemEnabled)
  const [betaEnabled, setBetaEnabled] = useState(settings.betaEnabled)
  const [betaEndDate, setBetaEndDate] = useState(
    settings.betaEndDate ? new Date(settings.betaEndDate).toISOString().split('T')[0] : ''
  )
  const [maxBetaUsers, setMaxBetaUsers] = useState(settings.maxBetaUsers)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackSystemEnabled: feedbackEnabled,
          betaEnabled: betaEnabled,
          betaEndDate: betaEndDate || null,
          maxBetaUsers: maxBetaUsers,
        }),
      })

      if (res.ok) {
        router.refresh()
        toast.success(t('admin.settingsSaved'))
      } else {
        toast.error(t('admin.saveError'))
      }
    } catch (error) {
      logger.error('Error saving settings:', error)
      toast.error(t('admin.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Feedback System */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-1">{t('admin.feedbackSystemTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('admin.feedbackSystemDescription')}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="feedback-enabled" className="cursor-pointer">
            {t('admin.feedbackWidgetEnabled')}
          </Label>
          <Switch
            id="feedback-enabled"
            checked={feedbackEnabled}
            onCheckedChange={setFeedbackEnabled}
          />
        </div>
      </div>

      {/* Beta Settings */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-1">{t('admin.betaSettings')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('admin.betaSettingsDescription')}
          </p>
        </div>

        {/* Beta Enabled Switch */}
        <div className="flex items-center justify-between">
          <Label htmlFor="beta-enabled" className="cursor-pointer">
            {t('admin.betaEnabled')}
          </Label>
          <Switch
            id="beta-enabled"
            checked={betaEnabled}
            onCheckedChange={setBetaEnabled}
          />
        </div>

        {/* Max Beta Users */}
        <div className="space-y-2">
          <Label htmlFor="max-beta-users">{t('admin.maxBetaUsers')}</Label>
          <Input
            id="max-beta-users"
            type="number"
            min="1"
            value={maxBetaUsers}
            onChange={(e) => setMaxBetaUsers(parseInt(e.target.value) || 10)}
            disabled={!betaEnabled}
          />
          <p className="text-xs text-muted-foreground">
            {t('admin.maxBetaUsersHint')}
          </p>
        </div>

        {/* Beta End Date */}
        <div className="space-y-2">
          <Label htmlFor="beta-end-date">{t('admin.betaEndDateLabel')}</Label>
          <Input
            id="beta-end-date"
            type="date"
            value={betaEndDate}
            onChange={(e) => setBetaEndDate(e.target.value)}
            disabled={!betaEnabled}
          />
          <p className="text-xs text-muted-foreground">
            {t('admin.betaEndDateHint')}
          </p>
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        size="lg"
        className="w-full sm:w-auto"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {t('admin.saving')}
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            {t('admin.saveSettings')}
          </>
        )}
      </Button>
    </div>
  )
}
