import type { ConfiguredProduct } from '../model/types'

/**
 * Same product can be configured twice with different growers → show the grower
 * so the user can tell them apart when assigning.
 */
export function growerLabel(cp: ConfiguredProduct): string {
  if (cp.growers.length === 0) return ''
  const first = cp.growers[0].grower.name
  return cp.growers.length > 1 ? `${first} +${cp.growers.length - 1}` : first
}
