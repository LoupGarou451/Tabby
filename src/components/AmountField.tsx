import { useState } from 'react'
import { percentOf } from '../lib/money'
import type { Amount } from '../lib/types'
import { MoneyInput, Segmented } from './ui'

/** Amount-or-percent input: a % / $ toggle beside one field. */
export function AmountField({
  label,
  value,
  base,
  currency,
  onChange,
}: {
  label: string
  value: Amount
  base: number
  currency: string
  onChange: (a: Amount) => void
}) {
  const [pctText, setPctText] = useState('')
  const [editing, setEditing] = useState(false)
  const symbol =
    new Intl.NumberFormat(undefined, { style: 'currency', currency })
      .formatToParts(0)
      .find((p) => p.type === 'currency')?.value ?? currency

  return (
    <div className="flex items-center gap-2">
      <div className="w-28 shrink-0">
        <Segmented
          label={`${label} as`}
          value={value.mode}
          onChange={(mode) => {
            // Convert so switching between % and amount keeps the same money value.
            if (mode === 'percent' && value.mode === 'amount')
              onChange({ mode, bps: base > 0 ? Math.round((value.value / base) * 10000) : 0 })
            if (mode === 'amount' && value.mode === 'percent')
              onChange({ mode, value: percentOf(base, value.bps) })
          }}
          options={[
            { value: 'percent', label: '%' },
            { value: 'amount', label: symbol },
          ]}
        />
      </div>
      {value.mode === 'percent' ? (
        <input
          aria-label={`${label} percent`}
          inputMode="decimal"
          placeholder="0"
          value={editing ? pctText : String(value.bps / 100)}
          onFocus={(e) => {
            setPctText(String(value.bps / 100))
            setEditing(true)
            e.currentTarget.select()
          }}
          onChange={(e) => {
            const text = e.target.value.replace(/[^\d.,]/g, '')
            setPctText(text)
            const n = Number(text.replace(',', '.'))
            if (Number.isFinite(n) && n >= 0 && n <= 100)
              onChange({ mode: 'percent', bps: Math.round(n * 100) })
          }}
          onBlur={() => setEditing(false)}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-right outline-none focus:border-brand"
        />
      ) : (
        <MoneyInput
          aria-label={`${label} amount`}
          value={value.value}
          currency={currency}
          onCommit={(v) => onChange({ mode: 'amount', value: v ?? 0 })}
          className="min-w-0 flex-1"
        />
      )}
    </div>
  )
}
