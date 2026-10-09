import { useMemo } from 'react'
import { computeSplit, type SplitMode } from '../lib/split'
import { useBill } from './billStore'

/** The current bill's split, in the bill's own split mode unless another is given. */
export function useSplit(mode?: SplitMode) {
  const bill = useBill((s) => s.bill)
  return useMemo(() => computeSplit(bill, mode), [bill, mode])
}
