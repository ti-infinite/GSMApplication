import { Combobox } from '@/shared/ui/combobox'
import type { Category } from '../model/types'
import type { UseSkuBuilderResult } from '../model/useSkuBuilder'

export interface SkuParamLabels {
  category:               string
  categoryPlaceholder:    string
  subcategory:            string
  subcategoryPlaceholder: string
  /** Placeholder for a parameter combo, given the parameter's display name. */
  param: (name: string) => string
}

/**
 * The SKU parameter cascade: category → (subcategory) → ordered parameter
 * combos. Pure presentation driven by `useSkuBuilder`; labels are injected so
 * the entity stays free of any feature's i18n namespace. Renders a fragment —
 * the consumer owns the surrounding layout.
 */
export function SkuParamFields({
  categories,
  sku,
  labels,
  size,
  fieldClassName = 'flex flex-col gap-1.5',
  labelClassName = 'text-sm font-medium text-foreground',
  disabledLabelClassName = 'text-sm font-medium text-muted-foreground',
}: {
  categories: Category[]
  sku:        UseSkuBuilderResult
  labels:     SkuParamLabels
  size?:      'default' | 'sm'
  /** Wrapper class per field; override to match the consumer's own field pattern. */
  fieldClassName?:         string
  labelClassName?:         string
  disabledLabelClassName?: string
}) {
  const hasChildren = !!(sku.selectedCategory?.Children && sku.selectedCategory.Children.length > 0)

  return (
    <>
      <div className={fieldClassName}>
        <label className={labelClassName}>{labels.category}</label>
        <Combobox
          size={size}
          options={categories.map(c => ({ value: String(c.IdCategory), label: c.Descr, badge: c.Code }))}
          value={String(sku.selectedCategory?.IdCategory ?? '')}
          onChange={val => sku.selectCategory(categories.find(c => String(c.IdCategory) === val) ?? null)}
          placeholder={labels.categoryPlaceholder}
        />
      </div>

      {hasChildren && (
        <div className={fieldClassName}>
          <label className={labelClassName}>{labels.subcategory}</label>
          <Combobox
            size={size}
            options={sku.selectedCategory!.Children!.map(c => ({ value: String(c.IdCategory), label: c.Descr, badge: c.Code }))}
            value={String(sku.selectedChildCategory?.IdCategory ?? '')}
            onChange={val => sku.selectChildCategory(sku.selectedCategory!.Children!.find(c => String(c.IdCategory) === val) ?? null)}
            placeholder={labels.subcategoryPlaceholder}
          />
        </div>
      )}

      {sku.rules.map((rule, idx) => {
        const param   = sku.getParameter(rule)
        const enabled = sku.isParamEnabled(idx)
        const value   = sku.selectedParams[rule.IdParameter]?.code ?? ''
        return (
          <div key={rule.IdSKUTemplateRule} className={fieldClassName}>
            <label className={enabled ? labelClassName : disabledLabelClassName}>
              {rule.RuleName}
            </label>
            <Combobox
              size={size}
              disabled={!enabled}
              options={(param?.paramAttributes ?? []).map(a => ({ value: a.code, label: a.shortName, badge: a.code }))}
              value={value}
              onChange={val => sku.selectParam(rule.IdParameter, param?.paramAttributes.find(a => a.code === val) ?? null)}
              placeholder={labels.param(rule.RuleName.toLowerCase())}
            />
          </div>
        )
      })}
    </>
  )
}
