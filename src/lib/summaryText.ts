import { formatMoney } from './money'
import type { SplitResult } from './split'
import type { Bill } from './types'

/** Plain-text summary for the share sheet / clipboard (design section 2, Step 5). */
export function summaryText(bill: Bill, split: SplitResult, link?: string): string {
  const fmt = (m: number) => formatMoney(m, bill.currency)
  const width = Math.max(...split.people.map((p) => p.label.length), 4)
  const lines = [
    `${bill.title} — ${fmt(split.billTotal)} total`,
    ...split.people.map(
      (p) =>
        `${p.label.padEnd(width)}  ${fmt(p.total)}${bill.treatedIds.includes(p.personId) ? ' 🎂' : ''}`,
    ),
  ]
  if (split.unassigned.total > 0) lines.push(`(Unassigned  ${fmt(split.unassigned.total)})`)
  if (link) lines.push('', link)
  lines.push('', 'Split with Tabby')
  return lines.join('\n')
}
