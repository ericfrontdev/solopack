import { Resend } from 'resend'
import { logger } from '@/lib/logger'

if (!process.env.RESEND_API_KEY) {
  logger.warn('RESEND_API_KEY is not set. Email sending will fail.')
}

export const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder')
