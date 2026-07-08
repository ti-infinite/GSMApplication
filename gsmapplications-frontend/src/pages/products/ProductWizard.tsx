import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { ErrorState } from '@/shared/components/ErrorState'
import { WizardStepper, type WizardStep } from '@/shared/ui/wizard-stepper'
import { useSkuBuilder } from '@/entities/product'
import { ProductPicker } from './ProductPicker'
import { useProductData } from './hooks/useProductData'

/**
 * Product wizard — mirrors the productivity AssignmentWizard, but for now it
 * only has the product step. New steps plug in by adding an entry to STEPS and
 * a matching `{step === N && ...}` block below; the footer auto-switches its
 * action (Next vs Confirm) based on whether the current step is the last.
 */
export function ProductWizard() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)

  // ── Add new steps here as the flow grows ────────────────────────
  const STEPS: WizardStep[] = [
    { id: 1, label: t('products.steps.product') },
  ]
  const isLastStep = step >= STEPS.length

  const { data, isLoading, isError } = useProductData()

  const sku = useSkuBuilder(
    data?.categories ?? [],
    [], // skuTemplates — endpoint not implemented for this model yet
    data?.parameters ?? [],
    data?.masterProducts ?? [],
    { categoryOnlyFallback: true }, // no templates → filter by category
  )

  const handleFinish = () => {
    if (!sku.selectedProduct || !sku.selectedVariety) return
    // TODO(integration): wire this to whatever the final step should do with
    // the selected product (save, navigate, hand off to the next step, etc.).
    toast.success(
      t('products.confirmed', {
        name: `${sku.selectedProduct.MasterProductName} - ${sku.selectedVariety.Name}`,
      }),
    )
  }

  const handleNext = () => {
    if (isLastStep) handleFinish()
    else setStep(s => s + 1)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-center gap-4">
          {STEPS.map(s => <Skeleton key={s.id} className="h-8 w-24 rounded-full" />)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-xl border border-border p-6">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return <ErrorState onRetry={() => queryClient.invalidateQueries()} />
  }

  return (
    <div className="flex flex-col gap-6">
      <WizardStepper steps={STEPS} current={step} />

      {step === 1 && (
        <div className="flex flex-col gap-6">
          <ProductPicker categories={data.categories} sku={sku} />

          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            {sku.isComplete ? (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">{sku.selectedProduct?.MasterProductName} - <strong>{sku.selectedVariety?.Name}</strong></span>
              </div>
            ) : sku.selectedProduct && !sku.selectedVariety ? (
              <span className="text-sm text-amber-600 dark:text-amber-400">{t('products.step1.hintSelectVariety')}</span>
            ) : sku.selectedProduct && sku.selectedVariety && !sku.initialQty ? (
              <span className="text-sm text-amber-600 dark:text-amber-400">{t('products.step1.hintInitialQty')}</span>
            ) : (
              <span className="text-sm text-muted-foreground">{t('products.selectPrompt')}</span>
            )}
            <Button onClick={handleNext} disabled={!sku.isComplete}>
              {isLastStep ? t('products.confirm') : t('products.next')}
            </Button>
          </div>
        </div>
      )}

      {/* Future steps go here, e.g.:
      {step === 2 && (
        <Step2Something
          ...
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      */}
    </div>
  )
}