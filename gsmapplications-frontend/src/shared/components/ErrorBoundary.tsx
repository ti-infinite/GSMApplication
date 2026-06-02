import { Component, type ReactNode } from 'react'
import i18n from 'i18next'

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
            <p className="text-2xl font-bold text-foreground">{i18n.t('errors.boundary.title')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{i18n.t('errors.boundary.subtitle')}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {i18n.t('errors.boundary.reload')}
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}