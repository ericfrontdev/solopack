'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from '@/lib/i18n-context'
import { logger } from '@/lib/logger'

type Project = {
  id: string
  name: string
  description: string | null
  status: string
  budget: number | null
  startDate: Date | null
  endDate: Date | null
  invoices?: Array<{ id: string; number: string; total: number }>
}

type Invoice = {
  id: string
  number: string
  total: number
  status: string
}

type PaymentPlanData = {
  numberOfInstallments: number
  frequency: number
}

export function ProjectModal({
  isOpen,
  onClose,
  onSave,
  project,
  clientName,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (
    data: {
      name: string
      description: string | null
      status: string
      budget: string | number | null
      startDate: string | null
      endDate: string | null
    },
    files: File[],
    paymentPlan?: PaymentPlanData
  ) => Promise<void>
  project: Project | null
  clientName?: string
}) {
  const { t } = useTranslation()
  const [step, setStep] = useState(1)
  const [hasPaymentPlan, setHasPaymentPlan] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    budget: '',
    startDate: '',
    endDate: '',
  })
  const [paymentPlan, setPaymentPlan] = useState({
    numberOfInstallments: 2,
    frequency: 30,
  })

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || '',
        status: project.status,
        budget: project.budget?.toString() || '',
        startDate: project.startDate
          ? new Date(project.startDate).toISOString().split('T')[0]
          : '',
        endDate: project.endDate
          ? new Date(project.endDate).toISOString().split('T')[0]
          : '',
      })
    } else {
      setFormData({
        name: '',
        description: '',
        status: 'active',
        budget: '',
        startDate: '',
        endDate: '',
      })
      setStep(1)
      setHasPaymentPlan(false)
      setPaymentPlan({
        numberOfInstallments: 2,
        frequency: 30,
      })
    }
  }, [project, isOpen])

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()

    logger.debug('Step 1 submit - hasPaymentPlan:', hasPaymentPlan, 'project:', project)

    if (hasPaymentPlan && !project) {
      // Passer à l'étape 2 pour configurer les versements
      logger.debug('Going to step 2 for payment plan configuration')
      setStep(2)
    } else {
      // Créer directement le projet sans plan de paiement
      logger.debug('Creating project without payment plan')
      await onSave(
        {
          name: formData.name,
          description: formData.description || null,
          status: formData.status,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
        },
        []
      )
    }
  }

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault()

    logger.debug('Step 2 submit - Creating project WITH payment plan:', paymentPlan)

    // Créer le projet avec le plan de paiement
    await onSave(
      {
        name: formData.name,
        description: formData.description || null,
        status: formData.status,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      },
      [],
      paymentPlan
    )
  }

  const handleCancel = () => {
    if (step === 2) {
      setStep(1)
    } else {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {project ? t('projects.editProject') : t('projects.newProject')}
            {clientName && !project && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {t('common.for')} {clientName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="mb-2 block">
                {t('projects.projectName')} *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="mb-2 block">
                {t('common.description')}
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status" className="mb-2 block">
                  {t('common.status')}
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('projects.active')}</SelectItem>
                    <SelectItem value="completed">
                      {t('projects.completed')}
                    </SelectItem>
                    <SelectItem value="paused">{t('projects.onHold')}</SelectItem>
                    <SelectItem value="cancelled">
                      {t('projects.cancelled')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="budget" className="mb-2 block">
                  {t('projects.budget')}
                </Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData({ ...formData, budget: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="mb-2 block">
                  {t('projects.startDate')}
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="endDate" className="mb-2 block">
                  {t('projects.endDate')}
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Payment plan switcher - Only show when creating a new project */}
            {!project && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">
                    {t('projects.paymentPlan.question')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        logger.debug('Payment plan set to: NO')
                        setHasPaymentPlan(false)
                      }}
                      className={`px-3 py-1 text-sm rounded-l-md border transition-colors ${
                        !hasPaymentPlan
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background hover:bg-muted'
                      }`}
                    >
                      {t('common.no')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        logger.debug('Payment plan set to: YES')
                        setHasPaymentPlan(true)
                      }}
                      className={`px-3 py-1 text-sm rounded-r-md border transition-colors ${
                        hasPaymentPlan
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background hover:bg-muted'
                      }`}
                    >
                      {t('common.yes')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {hasPaymentPlan && !project
                  ? t('common.next')
                  : project
                  ? t('common.update')
                  : t('common.create')}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleStep2Submit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="numberOfInstallments" className="mb-2 block">
                  {t('projects.paymentPlan.numberOfInstallments')}
                </Label>
                <Select
                  value={paymentPlan.numberOfInstallments.toString()}
                  onValueChange={(value) =>
                    setPaymentPlan({
                      ...paymentPlan,
                      numberOfInstallments: parseInt(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="frequency" className="mb-2 block">
                  {t('projects.paymentPlan.frequency')}
                </Label>
                <Select
                  value={paymentPlan.frequency.toString()}
                  onValueChange={(value) =>
                    setPaymentPlan({
                      ...paymentPlan,
                      frequency: parseInt(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">
                      {t('projects.paymentPlan.frequency7Days')}
                    </SelectItem>
                    <SelectItem value="14">
                      {t('projects.paymentPlan.frequency14Days')}
                    </SelectItem>
                    <SelectItem value="30">
                      {t('projects.paymentPlan.frequency30Days')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCancel}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">{t('common.create')}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
