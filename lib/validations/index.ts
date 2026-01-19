import { NextResponse } from 'next/server'
import { ZodError, ZodSchema } from 'zod'

/**
 * Validation error response helper
 */
export function validationError(error: ZodError<unknown>) {
  const errors = error.issues.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }))

  return NextResponse.json(
    {
      error: 'Validation échouée',
      details: errors,
    },
    { status: 400 }
  )
}

/**
 * Validate data against a Zod schema
 * Returns parsed data if valid, or throws validation error
 */
export async function validate<T>(
  schema: ZodSchema<T>,
  data: unknown
): Promise<T> {
  try {
    return await schema.parseAsync(data)
  } catch (error) {
    if (error instanceof ZodError) {
      throw error
    }
    throw new Error('Validation error')
  }
}

/**
 * Validate request body
 * Usage in API routes:
 *
 * const body = await validateBody(req, createClientSchema)
 * // body is now typed and validated
 */
export async function validateBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<T> {
  const body = await req.json()
  return validate(schema, body)
}

/**
 * Validate URL search params
 * Usage in API routes:
 *
 * const params = validateSearchParams(req, querySchema)
 */
export function validateSearchParams<T>(
  req: Request,
  schema: ZodSchema<T>
): T {
  const { searchParams } = new URL(req.url)
  const params = Object.fromEntries(searchParams.entries())
  return schema.parse(params)
}

/**
 * Validate route params
 * Usage in API routes:
 *
 * const { id } = validateParams(params, clientIdSchema)
 */
export function validateParams<T>(
  params: unknown,
  schema: ZodSchema<T>
): T {
  return schema.parse(params)
}

// Re-export all validation schemas
export * from './clients'
export * from './invoices'
export * from './projects'
export * from './user'
export * from './auth'
