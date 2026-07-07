import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { WizardStepper } from '@/shared/ui/wizard-stepper'
import { Step1Products } from './Step1Products'
import { Step2Employees } from './Step2Employees'
import { useSkuBuilder } from '@/entities/product'
import { useProductConfig } from '../model/useProductConfig'
import { useEmployeeGroups } from '../model/useEmployeeGroups'
import { useWizardData } from '../model/useWizardData'
import { Skeleton } from '@/shared/ui/skeleton'
import { ErrorState } from '@/shared/components/ErrorState'
import type { AssignmentResult } from '../model/types'

interface Props {
  onComplete: (result: AssignmentResult) => void
}

export function AssignmentWizard({ onComplete }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)

  const STEPS = [
    { id: 1, label: t('productivity.wizard.stepProduct') },
    { id: 2, label: t('productivity.wizard.stepEmployees') },
  ]

  const { data, isLoading, isError } = useWizardData()

  // Step 1 builds one product at a time (sku) and accumulates them (config).
  const sku = useSkuBuilder(
    data?.categories     ?? [],
    data?.skuTemplates   ?? [],
    data?.parameters     ?? [],
    data?.masterProducts ?? [],
  )
  const config = useProductConfig()
  const groups = useEmployeeGroups(data?.employees ?? [])

  const handleConfirm = () => {
    onComplete({
      products:       config.products,
      // Only mesas with people become transactions.
      employeeGroups: groups.groups.filter(g => g.employees.length > 0),
      mode:           groups.mode,
      // TODO(backend): TRX IDs come back via GET trx after create-trx.
      trxIds:         [],
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-center gap-4">
          {STEPS.map(s => <Skeleton key={s.id} className="h-8 w-24 rounded-full" />)}
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-[280px_minmax(0,1fr)_400px]">
          {/* Selección */}
          <div className="flex flex-col gap-3 rounded-xl border border-border p-4 md:col-span-2 xl:col-span-1">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
          {/* Productos */}
          <Skeleton className="h-72 rounded-xl" />
          {/* Configurados */}
          <Skeleton className="h-72 rounded-xl" />
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
        <Step1Products
          data={data}
          sku={sku}
          config={config}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <Step2Employees
          totalEmployees={data.employees.length}
          groups={groups}
          products={config.products}
          onBack={() => setStep(1)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}
