import { useEffect } from 'react'
import type { ExternalRendererProps } from '../ExternalPage'

export default function NewTabRenderer({ url }: ExternalRendererProps) {
  useEffect(() => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [url])

  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      Abriendo en nueva pestaña...
    </div>
  )
}