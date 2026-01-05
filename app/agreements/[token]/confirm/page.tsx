'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ThemeLogo } from '@/components/theme-logo'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function ConfirmAgreementPage() {
  const params = useParams()
  const token = params?.token as string
  const [loading, setLoading] = useState(true)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [agreementData, setAgreementData] = useState<any>(null)

  useEffect(() => {
    // Confirmer automatiquement l'entente au chargement de la page
    if (token) {
      confirmAgreement()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const confirmAgreement = async () => {
    setLoading(true)
    setError('')

    try {
      console.log('[confirm] Auto-confirming agreement with token:', token)

      // Confirmer l'entente
      const response = await fetch(`/api/agreements/${token}/confirm`, {
        method: 'POST',
      })

      const data = await response.json()
      console.log('[confirm] Confirmation response:', data)

      if (response.ok) {
        setConfirmed(true)
        setAgreementData(data.agreement)
      } else {
        setError(data.error || 'Une erreur est survenue')
      }
    } catch (err) {
      console.error('[confirm] Confirmation error:', err)
      setError('Une erreur est survenue lors de la confirmation')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-950 dark:to-slate-900 p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">Confirmation en cours...</h2>
          <p className="text-muted-foreground">Veuillez patienter pendant que nous confirmons votre entente.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col bg-background rounded-xl border shadow-lg p-8">
          <ThemeLogo className="mb-6 w-auto mx-auto" />

          {confirmed ? (
            <div className="text-center">
              <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-6" />
              <h1 className="text-3xl font-bold mb-4">Entente confirmée !</h1>
              <p className="text-lg text-muted-foreground mb-6">
                Merci d'avoir confirmé l'entente de paiement.
              </p>
              <div className="bg-muted/50 rounded-lg p-6 mb-6 text-left">
                <h2 className="font-semibold mb-3">Prochaines étapes :</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>Vous recevrez les factures de versement par email</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>Les dates de paiement ont été calculées à partir d'aujourd'hui</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>Vous recevrez un rappel avant chaque échéance</span>
                  </li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                Vous pouvez maintenant fermer cette page.
              </p>
            </div>
          ) : (
            <div className="text-center">
              <XCircle className="h-20 w-20 text-red-500 mx-auto mb-6" />
              <h1 className="text-3xl font-bold mb-4">Erreur</h1>
              <p className="text-lg text-muted-foreground mb-4">{error}</p>
              <p className="text-sm text-muted-foreground">
                Si le problème persiste, veuillez contacter le support.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
