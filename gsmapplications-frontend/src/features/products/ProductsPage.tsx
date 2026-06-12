import { useTranslation } from 'react-i18next'
import { ProductWizard } from './ProductWizard'

export default function ProductsPage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('products.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('products.subtitle')}</p>
      </div>

      <ProductWizard />
    </div>
  )
}