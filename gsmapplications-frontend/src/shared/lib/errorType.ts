export type ApiError = Error & { errorType?: number }

// Maps ErrorType enum (backend) to i18n keys
// ErrorType: Validation=0, Unauthorized=1, NotFound=2, BadRequest=3, Conflict=4, Internal=5
const ERROR_KEYS: Record<number, string> = {
  0: 'errors.validation',
  1: 'errors.unauthorized',
  2: 'errors.notFound',
  3: 'errors.badRequest',
  4: 'errors.conflict',
  5: 'errors.server',
}

export function errorTypeToKey(errorType?: number): string {
  return ERROR_KEYS[errorType ?? 5] ?? 'errors.server'
}