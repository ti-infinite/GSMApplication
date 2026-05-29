type State =
  | { status: 'loading' }
  | { status: 'ready'; embedUrl: string }
  | { status: 'error'; message: string }

// BiEmbed service pending migration to a new microservice.
// Replace this implementation when the new service is available.
export function useBiEmbed(_url: string): State {
  return { status: 'error', message: 'BiEmbed service not yet available' }
}