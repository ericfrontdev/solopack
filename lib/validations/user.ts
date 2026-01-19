import { z } from 'zod'

/**
 * Schema for updating user profile
 */
export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  email: z.string().email('Email invalide'),
  company: z.string().max(100, 'Le nom de la compagnie ne peut pas dépasser 100 caractères').optional().nullable(),
  phone: z.string().regex(/^\+?[\d\s\-()]+$/, 'Numéro de téléphone invalide').max(20).optional().nullable(),
  address: z.string().max(500, 'L\'adresse ne peut pas dépasser 500 caractères').optional().nullable(),
  neq: z.string().max(20, 'Le NEQ ne peut pas dépasser 20 caractères').optional().nullable(),
  tpsNumber: z.string().max(20, 'Le numéro TPS ne peut pas dépasser 20 caractères').optional().nullable(),
  tvqNumber: z.string().max(20, 'Le numéro TVQ ne peut pas dépasser 20 caractères').optional().nullable(),
  chargesTaxes: z.boolean().optional(),
  paymentProvider: z.enum(['stripe', 'paypal', 'helcim']).nullable().optional(),
  paypalEmail: z.string().email('Email PayPal invalide').optional().nullable(),
  stripeSecretKey: z.string().regex(/^sk_(test|live)_[a-zA-Z0-9]+$/, 'Clé Stripe invalide').optional().nullable(),
  autoRemindersEnabled: z.boolean().optional(),
  reminderMiseEnDemeureTemplate: z.string().max(5000, 'Le template ne peut pas dépasser 5000 caractères').optional().nullable(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
