import { AmountField } from '../components/AmountField'
import { TipPicker } from '../components/TipPicker'
import { Card } from '../components/ui'
import { formatMoney } from '../lib/money'
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
        <TipPicker tipBase={tipBase} />
      </Card>

      <Card className="flex items-center justify-between">
        <span className="font-semibold">Bill total</span>
        <span className="text-xl font-bold tabular-nums">{fmt(amounts.billTotal)}</span>
      </Card>
    </div>
  )
}
