import type { Bill } from './types'

export const STEPS = ['receipt', 'people', 'assign', 'tip', 'summary'] as const
export type Step = (typeof STEPS)[number]

const isAssigned = (bill: Bill, shares: Record<string, number>) =>
  bill.people.some((p) => (shares[p.id] ?? 0) > 0)

/**
 * What's missing before the user can move past `step`, or null if nothing is.
 * Each step asks only for the minimum needed to calculate final totals (design 2.1).
 */
export function stepBlocker(bill: Bill, step: Step): string | null {
  switch (step) {
    case 'receipt':
      return bill.items.length ? null : 'Add at least one item to continue'
    case 'people':
      return bill.people.length ? null : 'Add at least one person to continue'
    case 'assign': {
      if (bill.splitMode === 'even') return null
      const left = bill.items.filter((i) => !isAssigned(bill, i.shares)).length
      return left ? `Assign every item to continue (${left} left)` : null
    }
    default:
      return null
  }
}

/** A step is reachable when every step before it is complete. */
export function canReach(bill: Bill, target: Step): boolean {
  return STEPS.slice(0, STEPS.indexOf(target)).every((s) => stepBlocker(bill, s) === null)
}
