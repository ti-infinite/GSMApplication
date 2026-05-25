import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode; fallback?: ReactNode }
type State = { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="flex min-h-screen items-center justify-center bg-background p-8">
          <div className="max-w-md text-center">
            <p className="text-2xl font-bold text-foreground">Something went wrong</p>
            <p className="mt-2 text-sm text-muted-foreground">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}