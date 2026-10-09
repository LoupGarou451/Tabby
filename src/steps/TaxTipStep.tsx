import { useState } from 'react'
import { AmountField } from '../components/AmountField'
import { TipPicker } from '../components/TipPicker'
import { Card, MoneyInput } from '../components/ui'
import { formatMoney, formatPlain } from '../lib/money'
import { billAmounts } from '../lib/split'
import { useBill } from '../store/billStore'

export function TaxTipStep() {
  const bill = useBill((s) => s.bill)
  const setAdjustments = useBill((s) => s.setAdjustments)
  const { adjustments: adj, currency } = bill
  const amounts = billAmounts(bill)
  const fmt = (m: number) => formatMoney(m, currency)
  const tipBase =
    adj.tipBase === 'preTax' ? amounts.itemsSubtotal : amounts.itemsSubtotal + amounts.tax
  const [addingGratuity, setAddingGratuity] = useState(false)
  const hasGratuity = adj.serviceCharge > 0
  // Amounts read from a scan or typed into "Receipt totals" on Step 1.
  const fromReceipt = bill.printedTotal !== undefined || bill.items.some((i) => i.source === 'scan')
  const receiptNote = (
    <p className="-mt-1 text-xs text-muted">Filled in from your receipt — edit if needed.</p>
  )
  const breakdown: [string, number][] = [
    ['Items', amounts.itemsSubtotal],
    ['Discount', -amounts.discount],
    ['Tax', amounts.tax],
    ['Gratuity', amounts.service],
    [hasGratuity ? 'Additional tip' : 'Tip', amounts.tip],
  ]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold">Tax &amp; tip</h2>
        <p className="text-muted">
          {bill.splitMode === 'fair'
            ? 'Shared in proportion to what each person ordered.'
            : 'Shared equally, along with the rest of the bill.'}
        </p>
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Tax</h3>
          <span className="tabular-nums text-muted">{fmt(amounts.tax)}</span>
        </div>
        {fromReceipt && adj.tax.mode === 'amount' && adj.tax.value > 0 && receiptNote}
        <AmountField
          label="Tax"
          value={adj.tax}
          base={amounts.itemsSubtotal - amounts.discount}
          currency={currency}
          onChange={(tax) => setAdjustments({ tax })}
        />
      </Card>

      {hasGratuity || addingGratuity ? (
        <Card className="flex flex-col gap-3">
          <label className="flex items-center justify-between gap-3">
            <span className="font-semibold">Gratuity on the receipt</span>
            <MoneyInput
              aria-label="Gratuity or service charge"
              value={adj.serviceCharge || null}
              allowEmpty
              placeholder={formatPlain(0, currency)}
              currency={currency}
              onCommit={(v) => {
                setAdjustments({ serviceCharge: v ?? 0 })
                if (!v) setAddingGratuity(false)
              }}
              className="w-32"
            />
          </label>
          {fromReceipt && hasGratuity && receiptNote}
          <p className="text-xs text-muted">
            An automatic gratuity or service charge the restaurant already added.
          </p>
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => setAddingGratuity(true)}
          className="-my-1 self-start text-sm font-medium text-brand-strong underline-offset-2 hover:underline"
        >
          + Add a gratuity / service charge from the receipt
        </button>
      )}

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{hasGratuity ? 'Additional tip' : 'Tip'}</h3>
          <span className="tabular-nums text-muted">{fmt(amounts.tip)}</span>
        </div>
        {hasGratuity && (
          <p className="rounded-xl bg-surface-2 p-3 text-sm">
            A gratuity of {fmt(adj.serviceCharge)} is already included. Add more if you'd like.
          </p>
        )}
        <TipPicker tipBase={tipBase} />
      </Card>

      <Card className="flex flex-col gap-1 text-sm">
        {breakdown.map(
          ([label, value]) =>
            value !== 0 && (
              <div key={label} className="flex justify-between text-muted">
                <span>{label}</span>
                <span className="tabular-nums">
                  {value < 0 ? '−' : ''}
                  {fmt(Math.abs(value))}
                </span>
              </div>
            ),
        )}
        <div className="mt-1 flex items-center justify-between border-t border-line pt-2">
          <span className="font-semibold">Bill total</span>
          <span className="text-xl font-bold tabular-nums">{fmt(amounts.billTotal)}</span>
        </div>
      </Card>
    </div>
  )
}
