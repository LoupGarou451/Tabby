import { useState } from 'react'
import { Card, MoneyInput, Segmented } from '../components/ui'
import { cx } from '../lib/cx'
import { formatMoney, percentOf } from '../lib/money'
import { billAmounts } from '../lib/split'
import type { Amount } from '../lib/types'
import { useBill } from '../store/billStore'

const TIP_PRESETS = [1800, 2000, 2200]

export function TaxTipStep() {
  const bill = useBill((s) => s.bill)
  const setAdjustments = useBill((s) => s.setAdjustments)
  const { adjustments: adj, currency } = bill
  const amounts = billAmounts(bill)
  const fmt = (m: number) => formatMoney(m, currency)
  const tipBase =
    adj.tipBase === 'preTax' ? amounts.itemsSubtotal : amounts.itemsSubtotal + amounts.tax

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold">Tax &amp; tip</h2>
        <p className="text-muted">Split in proportion to what each person ordered.</p>
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Tax</h3>
          <span className="tabular-nums text-muted">{fmt(amounts.tax)}</span>
        </div>
        <AmountField
          label="Tax"
          value={adj.tax}
          base={amounts.itemsSubtotal - amounts.discount}
          currency={currency}
          onChange={(tax) => setAdjustments({ tax })}
        />
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Tip</h3>
          <span className="tabular-nums text-muted">{fmt(amounts.tip)}</span>
        </div>
        {adj.serviceCharge > 0 && (
          <p className="rounded-xl bg-warn/15 p-3 text-sm">
            This receipt already includes a {fmt(adj.serviceCharge)} service charge.
          </p>
        )}
        <div className="grid grid-cols-3 gap-2">
          {TIP_PRESETS.map((bps) => {
            const active = adj.tip.mode === 'percent' && adj.tip.bps === bps
            return (
              <button
                key={bps}
                type="button"
                aria-pressed={active}
                onClick={() => setAdjustments({ tip: { mode: 'percent', bps } })}
                className={cx(
                  'flex min-h-14 flex-col items-center justify-center rounded-xl border transition',
                  active ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
                )}
              >
                <span className="font-bold">{bps / 100}%</span>
                <span className={cx('text-xs tabular-nums', !active && 'text-muted')}>
                  {fmt(percentOf(tipBase, bps))}
                </span>
              </button>
            )
          })}
        </div>
        <AmountField
          label="Custom tip"
          value={adj.tip}
          base={tipBase}
          currency={currency}
          onChange={(tip) => setAdjustments({ tip })}
        />
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted">Tip calculated on</span>
          <Segmented
            label="Tip calculated on"
            value={adj.tipBase}
            onChange={(tipBase) => setAdjustments({ tipBase })}
            options={[
              { value: 'preTax', label: 'Before tax' },
              { value: 'postTax', label: 'After tax' },
            ]}
          />
        </div>
      </Card>

      <Card className="flex items-center justify-between">
        <span className="font-semibold">Bill total</span>
        <span className="text-xl font-bold tabular-nums">{fmt(amounts.billTotal)}</span>
      </Card>
    </div>
  )
}

/** Amount-or-percent input: a % / $ toggle beside one field. */
function AmountField({
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
