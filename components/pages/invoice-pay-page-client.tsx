'use client'

import { ThemeLogo } from '@/components/theme-logo'
import { PaymentButton } from '@/components/payment-button'
import { useTranslation } from '@/lib/i18n-context'

type Invoice = {
  id: string
  number: string
  status: string
  subtotal: number
  tps: number
  tvq: number
  total: number
  paidAt: Date | null
  client: {
    name: string
    email: string
    company: string | null
    address: string | null
    user: {
      name: string
      company: string | null
      paymentProvider: string | null
      paypalEmail: string | null
    }
  }
  items: Array<{
    id: string
    description: string
    amount: number
    date: Date
  }>
}

export function InvoicePayPageClient({ invoice }: { invoice: Invoice }) {
  const { t } = useTranslation()
  const isPaid = invoice.status === 'paid'
  const hasTaxes = invoice.tps > 0 || invoice.tvq > 0

  // Si le provider n'a pas configuré de moyen de paiement et que la facture n'est pas payée
  if (!invoice.client.user.paymentProvider && !isPaid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <ThemeLogo
              width={200}
              height={50}
              className="mx-auto mb-4"
            />
          </div>

          <div className="bg-card border rounded-xl shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold mb-2">
              {t('payment.unavailable')}
            </h1>
            <p className="text-muted-foreground">
              {t('payment.notConfigured')} {invoice.client.user.name}.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto py-8">
        <div className="text-center mb-8">
          <ThemeLogo
            width={200}
            height={50}
            className="mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold mb-2">
            {isPaid ? t('payment.invoicePaid') : t('payment.invoicePayment')}
          </h1>
          <p className="text-muted-foreground">
            {t('payment.invoice')} {invoice.number}
          </p>
          {isPaid && invoice.paidAt && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
              {t('payment.paidOn')}{' '}
              {new Intl.DateTimeFormat(t('common.locale')).format(
                new Date(invoice.paidAt)
              )}
            </p>
          )}
        </div>

        <div className="bg-card border rounded-xl shadow-lg p-6 mb-6">
          {/* Header facture */}
          <div className="flex items-start justify-between mb-6 pb-6 border-b">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {t('payment.from')}
              </p>
              {invoice.client.user.company && (
                <p className="font-semibold text-base">
                  {invoice.client.user.company}
                </p>
              )}
              <p className="text-sm">{invoice.client.user.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">
                {t('payment.to')}
              </p>
              <p className="font-medium">{invoice.client.name}</p>
              {invoice.client.company && (
                <p className="text-sm">{invoice.client.company}</p>
              )}
              {invoice.client.address && (
                <p className="text-sm">{invoice.client.address}</p>
              )}
              <p className="text-sm">{invoice.client.email}</p>
            </div>
          </div>

          {/* Items */}
          <div className="overflow-x-auto rounded-lg border mb-6">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left py-3 px-4">
                    {t('common.description')}
                  </th>
                  <th className="text-left py-3 px-4">{t('common.date')}</th>
                  <th className="text-right py-3 px-4">{t('common.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t"
                  >
                    <td className="py-3 px-4">{item.description}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Intl.DateTimeFormat(t('common.locale'), {
                        timeZone: 'UTC',
                      }).format(new Date(item.date))}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {item.amount.toFixed(2)} $
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {hasTaxes && (
                  <tr className="border-t">
                    <td
                      className="py-3 px-4"
                      colSpan={2}
                    >
                      <span className="text-sm text-muted-foreground">
                        {t('invoice.subtotal')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {invoice.subtotal.toFixed(2)} $
                    </td>
                  </tr>
                )}
                {hasTaxes && invoice.tps > 0 && (
                  <tr>
                    <td
                      className="py-3 px-4"
                      colSpan={2}
                    >
                      <span className="text-sm text-muted-foreground">
                        TPS (5%)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {invoice.tps.toFixed(2)} $
                    </td>
                  </tr>
                )}
                {hasTaxes && invoice.tvq > 0 && (
                  <tr>
                    <td
                      className="py-3 px-4"
                      colSpan={2}
                    >
                      <span className="text-sm text-muted-foreground">
                        TVQ (9,975%)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {invoice.tvq.toFixed(2)} $
                    </td>
                  </tr>
                )}
                <tr className="border-t">
                  <td
                    className="py-3 px-4"
                    colSpan={2}
                  >
                    <span className="text-base font-semibold">
                      {t('payment.totalToPay')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-2xl font-bold text-primary">
                    {invoice.total.toFixed(2)} $
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Bouton de paiement */}
          <div className="flex justify-center pt-4">
            <PaymentButton
              invoiceId={invoice.id}
              total={invoice.total}
              invoiceNumber={invoice.number}
              paymentProvider={invoice.client.user.paymentProvider}
              paypalEmail={invoice.client.user.paypalEmail}
              isPaid={isPaid}
            />
          </div>

          <div className="text-center text-sm text-muted-foreground mt-6">
            {/* <p>{t('payment.paymentTerms')}</p> */}
            <p className="mt-2">
              {t('payment.questionsContact')} {invoice.client.user.name}.
            </p>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          <p>Powered by SoloPack</p>
        </div>
      </div>
    </div>
  )
}
