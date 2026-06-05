import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WizardStepper } from './WizardStepper'
import { Step1Product } from './Step1Product'
import { Step2Employees } from './Step2Employees'
import { Step3Grower } from './Step3Grower'
import { useSkuBuilder } from './hooks/useSkuBuilder'
import { useEmployeeGroups } from './hooks/useEmployeeGroups'
import { useWizardData } from './hooks/useWizardData'
import { Skeleton } from '@/shared/ui/skeleton'
import type { AssignmentResult, Grower } from './types'

interface Props {
  onComplete: (result: AssignmentResult) => void
}

export function AssignmentWizard({ onComplete }: Props) {
  const { t } = useTranslation()
  const [step,           setStep]           = useState(1)
  const [itc,            setItc]            = useState('')
  const [productionType, setProductionType] = useState('')

  const STEPS = [
    { id: 1, label: t('productivity.wizard.stepProduct') },
    { id: 2, label: t('productivity.wizard.stepEmployees') },
    { id: 3, label: t('productivity.wizard.stepGrower') },
  ]

  const { data, isLoading, isError } = useWizardData()

  const sku = useSkuBuilder(
    data?.categories     ?? [],
    data?.skuTemplates   ?? [],
    data?.parameters     ?? [],
    data?.masterProducts ?? [],
  )

  const groups = useEmployeeGroups(data?.employees ?? [])

  const handleConfirm = (grower: Grower) => {
    if (!sku.selectedProduct || !sku.selectedVariety) return
    onComplete({
      product:        sku.selectedProduct,
      variety:        sku.selectedVariety,
      initialQty:     sku.initialQty ?? 0,
      skuPrefix:      sku.skuPrefix,
      mode:           groups.mode,
      employeeGroups: groups.groups.filter(g => g.employees.length > 0),
      grower,
      itc,
      productionType,
      // TODO(backend): el backend devolverá los TRX IDs vía GET trx tras create-trx.
      // Por ahora va vacío; ProductivityPage los sobreescribe con los IDs reales.
      trxIds:         [],
    })
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
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6">
        <p className="text-sm text-destructive">
          {t('productivity.wizard.loadError')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <WizardStepper steps={STEPS} current={step} />

      {step === 1 && (
        <Step1Product
          data={data}
          sku={sku}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <Step2Employees
          totalEmployees={data.employees.length}
          groups={groups}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && sku.selectedProduct && (
        <Step3Grower
          growers={data.growers}
          itc={itc}
          onItcChange={setItc}
          productionType={productionType}
          productionTypes={data.productionTypes}
          onProductionTypeChange={setProductionType}
          product={sku.selectedProduct}
          mode={groups.mode}
          employeeGroups={groups.groups.filter(g => g.employees.length > 0)}
          onBack={() => setStep(2)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}