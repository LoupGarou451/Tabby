import { useMemo } from 'react'
import { computeSplit, type SplitMode } from '../lib/split'
import { useBill } from './billStore'
import { useUi } from './uiStore'

/** The current bill's split in the mode chosen on the Summary (or an explicit mode). */
export function useSplit(mode?: SplitMode) {
  const bill = useBill((s) => s.bill)
  const uiMode = useUi((s) => s.splitMode)
  const m = mode ?? uiMode
  return useMemo(() => computeSplit(bill, m), [bill, m])
}
