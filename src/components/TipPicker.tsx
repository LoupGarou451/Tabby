import { formatMoney, percentOf } from '../lib/money'
import { cx } from '../lib/cx'
import { useBill } from '../store/billStore'
import { AmountField } from './AmountField'
import { Segmented } from './ui'

const TIP_PRESETS = [1800, 2000, 2200]

/** Tip presets (each showing its amount), a custom % / amount field, and the tip base. */
export function TipPicker({ tipBase }: { tipBase: number }) {
  const adj = useBill((s) => s.bill.adjustments)
  const currency = useBill((s) => s.bill.currency)
  const setAdjustments = useBill((s) => s.setAdjustments)
  const fmt = (m: number) => formatMoney(m, currency)

  return (
    <>
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
    </>
  )
}
