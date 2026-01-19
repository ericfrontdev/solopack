import { z } from 'zod'

/**
 * Schema for creating a new project
 */
export const createProjectSchema = z.object({
  clientId: z.string().cuid('ID client invalide'),
  name: z.string().min(1, 'Le nom est requis').max(200, 'Le nom ne peut pas dépasser 200 caractères'),
  description: z.string().max(2000, 'La description ne peut pas dépasser 2000 caractères').optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  amount: z.number().nonnegative('Le montant ne peut pas être négatif').max(999999999, 'Le montant est trop élevé').optional().nullable(),
  startDate: z.string().datetime('Date de début invalide').optional().nullable(),
  endDate: z.string().datetime('Date de fin invalide').optional().nullable(),
  // Payment plan fields
  paymentPlanEnabled: z.boolean().optional(),
  installmentCount: z.number().int().min(2).max(12).optional().nullable(),
  installmentFrequency: z.enum(['weekly', 'biweekly', 'monthly']).optional().nullable(),
  firstInstallmentDate: z.string().datetime().optional().nullable(),
})

/**
 * Schema for updating an existing project
 */
export const updateProjectSchema = createProjectSchema.partial().omit({ clientId: true })

/**
 * Schema for project ID parameter
 */
export const projectIdSchema = z.object({
  id: z.string().cuid('ID projet invalide'),
})

/**
 * Schema for querying projects by client
 */
export const projectsQuerySchema = z.object({
  clientId: z.string().cuid('ID client invalide').optional(),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type ProjectIdInput = z.infer<typeof projectIdSchema>
export type ProjectsQueryInput = z.infer<typeof projectsQuerySchema>
