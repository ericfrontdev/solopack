import { z } from 'zod'

/**
 * Schema for user registration
 */
export const registerSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').max(100),
  company: z.string().max(100).optional().nullable(),
})

/**
 * Schema for user login
 */
export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
})

/**
 * Schema for forgot password
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
})

/**
 * Schema for reset password
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').max(100),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
