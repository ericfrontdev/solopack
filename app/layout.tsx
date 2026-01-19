import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/lib/theme-context'
import { I18nProvider } from '@/lib/i18n-context'
import { SWRProvider } from '@/lib/swr-provider'
import { Navigation } from '@/components/navigation'
import { FeedbackWidget } from '@/components/feedback-widget'
import { BetaEndBlocker } from '@/components/beta-end-blocker'
import { Toaster } from 'sonner'
import { auth } from '@/auth'
import { isSuperAdmin } from '@/lib/check-super-admin'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SoloPack',
  description: 'Pack d\'outils complet pour solopreneurs québécois',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const isAdmin = session?.user?.id ? await isSuperAdmin(session.user.id) : false

  // Vérifier l'URL actuelle pour permettre l'accès à /pricing
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  const isPricingPage = pathname.startsWith('/pricing')

  // Vérifier si la période bêta est terminée
  let isBetaEnded = false
  let betaEndDate: Date | null = null
  let isWithin30Days = false

  if (session?.user?.id && !isAdmin) {
    try {
      // Récupérer ou créer les paramètres système
      let settings = await prisma.systemSettings.findFirst()
      if (!settings) {
        settings = await prisma.systemSettings.create({
          data: {
            feedbackSystemEnabled: true,
            betaEndDate: null,
          },
        })
      }

      if (settings?.betaEndDate) {
        const now = new Date()
        const endDate = new Date(settings.betaEndDate)
        betaEndDate = endDate

        // Si la date de fin est passée
        if (now > endDate) {
          // Vérifier si l'utilisateur a un plan payant
          const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
              plan: true,
              betaTester: true,
              lifetimeDiscount: true,
              createdAt: true
            }
          })

          // Bloquer si pas de plan ou plan gratuit
          if (!user?.plan || user.plan === 'free') {
            isBetaEnded = true

            // Vérifier si on est dans les 30 jours après la fin du beta
            const thirtyDaysAfterEnd = new Date(endDate)
            thirtyDaysAfterEnd.setDate(thirtyDaysAfterEnd.getDate() + 30)
            isWithin30Days = now <= thirtyDaysAfterEnd

            // Marquer automatiquement comme beta tester avec 50% si dans les 30 jours
            // et pas déjà marqué
            if (user && isWithin30Days && (!user.betaTester || user.lifetimeDiscount !== 50)) {
              await prisma.user.update({
                where: { id: session.user.id },
                data: {
                  betaTester: true,
                  lifetimeDiscount: 50,
                },
              })
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking beta status:', error)
      // En cas d'erreur, on continue sans bloquer l'utilisateur
    }
  }

  return (
    <html
      lang="fr"
      suppressHydrationWarning={true}
    >
      <body className={inter.className}>
        <ThemeProvider>
          <I18nProvider>
            <SWRProvider>
              <Toaster richColors position="bottom-right" />
              {isBetaEnded && !isPricingPage ? (
                <BetaEndBlocker
                  betaEndDate={betaEndDate}
                  isWithin30Days={isWithin30Days}
                />
              ) : (
                <>
                  <Navigation user={session?.user} isSuperAdmin={isAdmin} />
                  <main className="min-h-screen bg-background overflow-x-visible">{children}</main>
                  {session?.user && <FeedbackWidget />}
                </>
              )}
            </SWRProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
