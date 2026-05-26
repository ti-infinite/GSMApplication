import { useState, useEffect } from 'react'
import Cookies from 'js-cookie'

type State =
  | { status: 'loading' }
  | { status: 'ready'; embedUrl: string }
  | { status: 'error'; message: string }

export function useBiEmbed(url: string): State {
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

  return state
}