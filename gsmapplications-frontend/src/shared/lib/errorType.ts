import { ErrorType } from '@/shared/api/auth/model'

export type ApiError = Error & { errorType?: string }

const ERROR_KEYS: Record<string, string> = {
  [ErrorType.Validation]:   'errors.validation',
  [ErrorType.Unauthorized]: 'errors.unauthorized',
  [ErrorType.NotFound]:     'errors.notFound',
  [ErrorType.BadRequest]:   'errors.badRequest',
  [ErrorType.Conflict]:     'errors.conflict',
  [ErrorType.Internal]:     'errors.server',
  [ErrorType.Forbidden]:    'errors.forbidden',
}

export function errorTypeToKey(errorType?: string): string {
  if (!errorType) return 'errors.server'
  return ERROR_KEYS[errorType] ?? 'errors.server'
}