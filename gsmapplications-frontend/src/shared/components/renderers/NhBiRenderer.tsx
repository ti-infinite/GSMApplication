import { useTranslation } from 'react-i18next'
import { useBiEmbed } from '@/shared/hooks/useBiEmbed'
import type { ExternalRendererProps } from '../ExternalPage'

export default function NhBiRenderer({ url, title }: ExternalRendererProps) {
  const { t } = useTranslation()
  const state = useBiEmbed(url)

  if (state.status === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        {t('biEmbed.loading')}
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-destructive">
        {t('biEmbed.error')}: {state.message}
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