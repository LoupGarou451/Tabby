import { useState } from 'react'
import { copyText } from '../lib/clipboard'
import { TipPicker } from '../components/TipPicker'
import { Avatar, Button, Card, MoneyInput, Switch } from '../components/ui'
import { formatMoney, formatPlain } from '../lib/money'
import { billAmounts } from '../lib/split'
import { summaryText } from '../lib/summaryText'
import { CaptureButtons } from '../scan/CaptureButtons'
import { useBill } from '../store/billStore'
import { usePrefs } from '../store/prefsStore'
import { useSplit } from '../store/useSplit'
import { useUi } from '../store/uiStore'
import { PayButtons } from './PayButtons'

/** "Just split it evenly": total, people, tip — one screen (design section 10.10). */
export function QuickSplit() {
  const bill = useBill((s) => s.bill)
  const setQuick = useBill((s) => s.setQuick)
  const setRoundUp = useBill((s) => s.setRoundUp)
  const itemizeInstead = useBill((s) => s.itemizeInstead)
  const addPerson = useBill((s) => s.addPerson)
  const removePerson = useBill((s) => s.removePerson)
  const setPayer = useBill((s) => s.setPayer)
  const openSheet = useUi((s) => s.openSheet)
  const setStep = useUi((s) => s.setStep)
  const handles = usePrefs((s) => s.payHandles)
  const split = useSplit('even')
  const [naming, setNaming] = useState(bill.people.length > 0)
  const [name, setName] = useState('')
  const [copied, setCopied] = useState(false)

  const quick = bill.quick ?? { total: 0, tax: 0, headcount: 2 }
  const amounts = billAmounts(bill)
  const tipBase = bill.adjustments.tipBase === 'preTax' ? quick.total - quick.tax : quick.total
  const fmt = (m: number) => formatMoney(m, bill.currency)
  const totals = split.people.map((p) => p.total)
  const hi = totals.length ? Math.max(...totals) : 0
  const lo = totals.length ? Math.min(...totals) : 0
  const payer = bill.people.find((p) => p.id === bill.payerId)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold">Split it evenly</h2>
        <p className="text-muted">Total, people, tip — done.</p>
      </div>

      <Card className="flex flex-col gap-3">
        <label className="flex items-center justify-between gap-3">
          <span className="font-medium">Total on receipt</span>
          <MoneyInput
            value={quick.total || null}
            allowEmpty
            placeholder={formatPlain(0, bill.currency)}
            currency={bill.currency}
            onCommit={(v) => setQuick({ total: v ?? 0 })}
            className="w-36 text-lg font-semibold"
          />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span>
            Tax <span className="text-sm text-muted">(optional)</span>
          </span>
          <MoneyInput
            value={quick.tax || null}
            allowEmpty
            placeholder="—"
            currency={bill.currency}
            onCommit={(v) => setQuick({ tax: Math.min(v ?? 0, quick.total) })}
            className="w-36"
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted">Or scan the receipt for its total:</span>
          <CaptureButtons purpose="total" compact />
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">People</span>
          {!naming ? (
            <div className="flex items-center rounded-xl border border-line">
              <button
                type="button"
                aria-label="Fewer people"
                disabled={quick.headcount <= 1}
                onClick={() => setQuick({ headcount: quick.headcount - 1 })}
                className="h-11 w-11 text-xl disabled:opacity-30"
              >
                −
              </button>
              <span className="w-8 text-center text-lg font-bold tabular-nums" aria-live="polite">
                {quick.headcount}
              </span>
              <button
                type="button"
                aria-label="More people"
                disabled={quick.headcount >= 50}
                onClick={() => setQuick({ headcount: quick.headcount + 1 })}
                className="h-11 w-11 text-xl disabled:opacity-30"
              >
                +
              </button>
            </div>
          ) : (
            <span className="text-muted">{bill.people.length} named</span>
          )}
        </div>
        {!naming ? (
          <button
            type="button"
            onClick={() => setNaming(true)}
            className="self-start text-sm font-medium text-brand-strong underline-offset-2 hover:underline"
          >
            Add names (for payment links)
          </button>
        ) : (
          <>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!name.trim()) return
                addPerson(name)
                setName('')
              }}
            >
              <input
                aria-label="Name"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand"
              />
              <Button type="submit" variant="primary" disabled={!name.trim()}>
                Add
              </Button>
            </form>
            <div className="flex flex-wrap gap-2">
              {bill.people.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line py-1 pr-1 pl-1"
                >
                  <Avatar name={p.name} colorIndex={p.colorIndex} size={28} />
                  <span className="text-sm">{p.name}</span>
                  <button
                    type="button"
                    aria-label={
                      bill.payerId === p.id ? `${p.name} paid` : `${p.name} paid the bill`
                    }
                    aria-pressed={bill.payerId === p.id}
                    title="Paid the bill"
                    onClick={() => setPayer(bill.payerId === p.id ? undefined : p.id)}
                    className={bill.payerId === p.id ? 'px-1' : 'px-1 opacity-40'}
                  >
                    💳
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${p.name}`}
                    onClick={() => removePerson(p.id)}
                    className="h-8 w-8 rounded-full text-muted hover:bg-surface-2"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">Tip</span>
          <span className="tabular-nums text-muted">{fmt(amounts.tip)}</span>
        </div>
        {!quick.tax && quick.total > 0 && (
          <p className="text-xs text-muted">Add tax above for a pre-tax tip.</p>
        )}
        <TipPicker tipBase={tipBase} />
      </Card>

      <Card className="flex flex-col items-center gap-1 border-brand/40 py-6 text-center">
        {split.people.length > 0 && quick.total > 0 ? (
          <>
            <span className="text-sm text-muted">Each person pays</span>
            <span className="text-5xl font-extrabold tabular-nums">{fmt(hi)}</span>
            {hi !== lo && (
              <span className="text-sm text-muted">
                {totals.filter((t) => t === hi).length} pay {fmt(hi)},{' '}
                {totals.filter((t) => t === lo).length} pay {fmt(lo)}
              </span>
            )}
            <span className="mt-1 text-sm text-muted">Total with tip {fmt(split.billTotal)}</span>
          </>
        ) : (
          <span className="text-muted">Enter the total to see each share.</span>
        )}
      </Card>

      {payer && bill.people.length > 1 && quick.total > 0 && (
        <Card className="flex flex-col gap-3">
          <span className="font-medium">Pay {payer.name}</span>
          {split.people
            .filter((p) => p.personId !== payer.id)
            .map((p) => (
              <div key={p.personId} className="flex flex-col gap-2">
                <span className="text-sm">
                  {p.label} · <span className="font-semibold">{fmt(p.total)}</span>
                </span>
                <PayButtons
                  payerName={payer.name}
                  personName={p.label}
                  amount={p.total}
                  currency={bill.currency}
                  title={bill.title}
                  handles={handles}
                />
              </div>
            ))}
        </Card>
      )}

      <Card>
        <Switch checked={bill.roundUp} onChange={setRoundUp} label="Round everyone up" />
      </Card>

      <div className="flex flex-col gap-2">
        <Button
          variant="primary"
          className="min-h-12"
          disabled={!quick.total}
          onClick={() => openSheet('share')}
        >
          🔗 Share link &amp; QR code
        </Button>
        <Button
          disabled={!quick.total}
          onClick={async () => {
            const text = summaryText(bill, split)
            if (navigator.share) {
              try {
                await navigator.share({ title: bill.title, text })
                return
              } catch {
                // fall through to copy
              }
            }
            if (!(await copyText(text))) return
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
        >
          {copied ? '✓ Copied' : '📋 Share as text'}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            itemizeInstead()
            setStep('receipt')
          }}
        >
          Itemize instead →
        </Button>
      </div>
    </div>
  )
}
