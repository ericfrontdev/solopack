'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTranslation } from '@/lib/i18n-context'
import { logger } from '@/lib/logger'

export function AddRevenueModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { description: string; amount: number; date: string; category?: string }) => Promise<void>
}) {
  const { t } = useTranslation()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onSave({
        description,
        amount: parseFloat(amount),
        date,
        category: category || undefined,
      })

      // Reset form
      setDescription('')
      setAmount('')
      setDate(new Date().toISOString().split('T')[0])
      setCategory('')
      onClose()
    } catch (error) {
      logger.error('Error saving revenue:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('accounting.addRevenue')}</DialogTitle>
          <DialogDescription>
            {t('accounting.recordManualRevenue')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">{t('common.description')} *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('accounting.exSaleOfProduct')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">{t('accounting.amountDollar')} *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">{t('common.date')} *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{t('accounting.categoryOptional')}</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t('accounting.exSalesServices')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('accounting.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
