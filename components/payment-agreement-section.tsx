'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Mail, CheckCircle2, Clock } from 'lucide-react'
import { useTranslation } from '@/lib/i18n-context'

type PaymentAgreement = {
  id: string
  numberOfInstallments: number
  frequency: number
  amountPerInstallment: number
  status: string
  confirmedAt: Date | null
  createdAt: Date
  token: string
}

function getFrequencyText(frequency: number, t: (key: string) => string): string {
  switch (frequency) {
    case 7:
      return t('projects.paymentPlan.frequency7Days')
    case 14:
      return t('projects.paymentPlan.frequency14Days')
    case 30:
      return t('projects.paymentPlan.frequency30Days')
    default:
      return `${frequency} ${t('projects.paymentPlan.frequency7Days').split(' ')[1]}`
  }
}

export function PaymentAgreementSection({
  agreement,
  clientEmail,
}: {
  agreement: PaymentAgreement
  projectName?: string
  clientEmail: string
}) {
  const [sending, setSending] = useState(false)
  const { t, locale } = useTranslation()

  const handleResend = async () => {
    setSending(true)
    try {
      const res = await fetch(`/api/agreements/${agreement.token}/resend`, {
        method: 'POST',
      })

      if (res.ok) {
        alert('Entente renvoyée avec succès!')
      } else {
        alert('Erreur lors de l\'envoi de l\'entente')
      }
    } catch {
      alert('Erreur lors de l\'envoi de l\'entente')
    } finally {
      setSending(false)
    }
  }

  const isPending = agreement.status === 'pending'
  const isConfirmed = agreement.status === 'confirmed'

  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{t('projects.paymentPlan.agreement')}</h2>
        </div>
        {isConfirmed ? (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-full text-sm">
            <CheckCircle2 className="h-4 w-4" />
            <span>{t('projects.paymentPlan.confirmed')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-full text-sm">
            <Clock className="h-4 w-4" />
            <span>{t('projects.paymentPlan.pending')}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-sm text-muted-foreground">{t('projects.paymentPlan.numberOfInstallments')}</p>
          <p className="text-lg font-semibold">{agreement.numberOfInstallments}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t('projects.paymentPlan.amountPerInstallment')}</p>
          <p className="text-lg font-semibold">{agreement.amountPerInstallment.toFixed(2)} $</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t('projects.paymentPlan.frequencyLabel')}</p>
          <p className="text-lg font-semibold">{getFrequencyText(agreement.frequency, t)}</p>
        </div>
      </div>

      {isConfirmed && agreement.confirmedAt && (
        <p className="text-sm text-muted-foreground mb-4">
          {t('projects.paymentPlan.confirmedOn')}{' '}
          {new Date(agreement.confirmedAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      )}

      {isPending && (
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-2">
            {t('projects.paymentPlan.pendingConfirmation')} ({clientEmail}).
          </p>
          <Button
            onClick={handleResend}
            disabled={sending}
            size="sm"
            variant="outline"
            className="mt-2"
          >
            <Mail className="h-4 w-4 mr-2" />
            {sending ? t('projects.paymentPlan.sendingAgreement') : t('projects.paymentPlan.resendAgreement')}
          </Button>
        </div>
      )}
    </div>
  )
}
