'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import { useTranslation } from '@/lib/i18n-context'
import { logger } from '@/lib/logger'

interface PricingCardProps {
  isBetaTester: boolean
  lifetimeDiscount: number
}

export function PricingCard({
  isBetaTester,
  lifetimeDiscount,
}: PricingCardProps) {
  const { t } = useTranslation()

  const features = [
    t('pricing.features.unlimitedClients'),
    t('pricing.features.taxInvoicing'),
    t('pricing.features.onlinePayments'),
    t('pricing.features.autoReminders'),
    t('pricing.features.crmFeatures'),
    t('pricing.features.fullAccounting'),
    t('pricing.features.prioritySupport'),
    t('pricing.features.freeUpdates'),
  ]
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const regularPrice = 39
  const discountedPrice =
    isBetaTester && lifetimeDiscount > 0
      ? regularPrice * (1 - lifetimeDiscount / 100)
      : regularPrice

  const handleSubscribe = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/helcim/create-checkout', {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('pricing.sessionError'))
        setLoading(false)
        return
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        setError(t('pricing.noPaymentUrl'))
        setLoading(false)
      }
    } catch (err) {
      logger.error('Error:', err)
      setError(t('pricing.genericError'))
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">{t('pricing.joinPro')}</h1>
        <p className="text-xl text-muted-foreground">
          {t('pricing.completePlatform')}
        </p>
      </div>

      {/* Pricing Card */}
      <div className="bg-card border-2 border-primary rounded-xl p-8 shadow-2xl">
        {/* Badge Beta Tester */}
        {isBetaTester && lifetimeDiscount > 0 && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg text-center mb-6 font-semibold">
            🎉 {t('pricing.exclusiveOffer')}
          </div>
        )}

        {/* Prix */}
        <div className="text-center mb-8">
          <div className="text-5xl font-bold mb-2">
            {discountedPrice.toFixed(2)}$
            <span className="text-2xl text-muted-foreground font-normal">
              /{t('pricing.perMonth')}
            </span>
          </div>

          {isBetaTester && lifetimeDiscount > 0 && (
            <>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="line-through text-muted-foreground text-lg">
                  {regularPrice}$/{t('pricing.perMonth')}
                </span>
                <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 px-3 py-1 rounded-full text-sm font-semibold">
                  -{lifetimeDiscount}% {t('pricing.lifetime')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('pricing.priceGuaranteed')} 🔒
              </p>
            </>
          )}
        </div>

        {/* Features */}
        <div className="space-y-3 mb-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-3"
            >
              <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-base">{feature}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <Button
          size="lg"
          className="w-full text-lg"
          onClick={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t('common.loading')}
            </>
          ) : (
            t('pricing.subscribeNow')
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground mt-4">
          {t('pricing.securePaymentHelcim')}
        </p>
      </div>

      {/* Warning pour beta testers */}
      {isBetaTester && lifetimeDiscount > 0 && (
        <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-semibold mb-1">
                ⚠️ {t('pricing.importantBetaTesters')}
              </p>
              <p>
                {t('pricing.betaTesterWarning1')} {lifetimeDiscount}%{' '}
                {t('pricing.betaTesterWarning2')} {regularPrice}$/
                {t('pricing.perMonth')} {t('pricing.betaTesterWarning3')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
