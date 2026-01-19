import { z } from 'zod'

/**
 * Schema for creating a new client
 */
export const createClientSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  company: z.string().max(100, 'Le nom de la compagnie ne peut pas dépasser 100 caractères').optional().nullable(),
  email: z.string().email('Email invalide'),
  phone: z.string().regex(/^\+?[\d\s\-()]+$/, 'Numéro de téléphone invalide').max(20).optional().nullable(),
  address: z.string().max(500, 'L\'adresse ne peut pas dépasser 500 caractères').optional().nullable(),
  website: z.string().url('URL invalide').optional().nullable(),
})

/**
 * Schema for updating an existing client
 * Same as create but all fields are optional
 */
export const updateClientSchema = createClientSchema.partial()

/**
 * Schema for client ID parameter
 */
export const clientIdSchema = z.object({
  id: z.string().cuid('ID client invalide'),
})

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
export type ClientIdInput = z.infer<typeof clientIdSchema>
