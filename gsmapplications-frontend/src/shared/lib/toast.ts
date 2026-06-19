import { toast } from 'sonner'
import { type ApiError } from '@/shared/lib/errorType'

/**
 * Error toast that appends the backend `traceId` as a reference when present,
 * so the user can report it and support can find the matching log in CloudWatch.
 */
export function toastApiError(message: string, error?: unknown) {
  const traceId = (error as ApiError | undefined)?.traceId
  toast.error(message, traceId ? { description: `Ref: ${traceId}` } : undefined)
}
