import { useState, useEffect } from 'react'
import Cookies from 'js-cookie'
import type { ExternalRendererProps } from '../ExternalPage'

type State =
  | { status: 'loading' }
  | { status: 'ready'; embedUrl: string }
  | { status: 'error'; message: string }

export default function NhBiRenderer({ url, title }: ExternalRendererProps) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    setState({ status: 'loading' })

    const token = Cookies.get('gsm_token')

    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        return res.json()
      })
      .then((data: { embedUrl?: string; data?: { embedUrl?: string } }) => {
        const embedUrl = data.embedUrl ?? data.data?.embedUrl
        if (!embedUrl) throw new Error('embedUrl not found in response')
        setState({ status: 'ready', embedUrl })
      })
      .catch((err: Error) => setState({ status: 'error', message: err.message }))
  }, [url])

  if (state.status === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Cargando reporte...
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-destructive">
        Error al cargar el reporte: {state.message}
      </div>
    )
  }

  return (
    <iframe
      src={state.embedUrl}
      title={title}
      className="flex-1 border-0"
      allow="fullscreen"
    />
  )
}