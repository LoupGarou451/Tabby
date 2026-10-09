import { useMemo, useState } from 'react'
import { Logo } from '../brand/Logo'
import { Avatar, Button, Card, PersonChip } from '../components/ui'
import { formatMoney } from '../lib/money'
import { decodeShare } from '../lib/share'
import { computeSplit, type PersonSplit } from '../lib/split'
import type { Bill } from '../lib/types'
import { useBill } from '../store/billStore'
import { PayButtons } from './PayButtons'

/** Read-only view of a shared bill: "Who are you?" → your total → pay. */
export function Viewer({ hash, onExit }: { hash: string; onExit: () => void }) {
  const payload = useMemo(() => decodeShare(hash), [hash])
  const importSharedBill = useBill((s) => s.importSharedBill)
  const [me, setMe] = useState<string | null>(null)
  const [everyone, setEveryone] = useState(false)

  if (!payload)
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="text-4xl" aria-hidden="true">
            🔗
          </div>
          <p className="font-semibold">This link looks broken</p>
          <p className="text-sm text-muted">It may have been cut off when it was copied.</p>
          <Button variant="primary" onClick={onExit}>
            Open Tabby
          </Button>
        </div>
      </Shell>
    )

  const { bill, mode, handles } = payload
  const split = computeSplit(bill, mode)
  const payer = bill.people.find((p) => p.id === bill.payerId)
  const fmt = (m: number) => formatMoney(m, bill.currency)
  const mine = split.people.find((p) => p.personId === me)
  const others = split.people.filter((p) => p.personId !== me)

  return (
    <Shell>
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold">{bill.title}</h1>
        <p className="text-muted">
          {fmt(split.billTotal)} total · {split.people.length} people ·{' '}
          {mode === 'fair' ? 'split by what you had' : 'split evenly'}
        </p>
      </div>

      {split.people.length === 0 ? (
        <p className="text-center text-muted">Nobody has been added to this bill yet.</p>
      ) : !mine ? (
        <div className="flex flex-col items-center gap-3">
          <h2 className="font-semibold">Who are you?</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {split.people.map((p) => {
              const person = bill.people.find((x) => x.id === p.personId)
              return (
                <PersonChip
                  key={p.personId}
                  name={p.label}
                  colorIndex={person?.colorIndex ?? 0}
                  selected={false}
                  onClick={() => setMe(p.personId)}
                />
              )
            })}
          </div>
        </div>
      ) : (
        <>
          <ViewerCard split={mine} bill={bill} big />
          {payer && payer.id !== mine.personId && mine.total > 0 && (
            <Card className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                {payer.name} paid the bill. Send them {fmt(mine.total)}:
              </p>
              <PayButtons
                payerName={payer.name}
                personName={mine.label}
                amount={mine.total}
                currency={bill.currency}
                title={bill.title}
                handles={handles}
              />
            </Card>
          )}
          <button
            type="button"
            onClick={() => setMe(null)}
            className="text-sm text-muted underline"
          >
            Not {mine.label}?
          </button>
        </>
      )}

      <div className="flex flex-col gap-3">
        <Button onClick={() => setEveryone(!everyone)}>
          {everyone ? 'Hide everyone' : 'See everyone'}
        </Button>
        {everyone &&
          (mine ? others : split.people).map((p) => (
            <ViewerCard key={p.personId} split={p} bill={bill} />
          ))}
      </div>

      <div className="flex flex-col items-center gap-2 border-t border-line pt-4">
        <Button
          onClick={() => {
            importSharedBill(bill)
            onExit()
          }}
        >
          ✏️ Save a copy to edit
        </Button>
        <p className="text-center text-xs text-muted">Your current bill is kept in history.</p>
      </div>
    </Shell>
  )
}

function ViewerCard({
  split: p,
  bill,
  big = false,
}: {
  split: PersonSplit
  bill: Bill
  big?: boolean
}) {
  const person = bill.people.find((x) => x.id === p.personId)
  const fmt = (m: number) => formatMoney(m, bill.currency)
  const itemName = (id: string) => bill.items.find((i) => i.id === id)?.name ?? ''
  const treated = bill.treatedIds.includes(p.personId)
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {person && (
          <Avatar name={person.name} colorIndex={person.colorIndex} size={big ? 48 : 36} />
        )}
        <span className="min-w-0 flex-1 truncate font-semibold">{p.label}</span>
        <span
          className={big ? 'text-3xl font-bold tabular-nums' : 'text-xl font-bold tabular-nums'}
        >
          {fmt(p.total)}
        </span>
      </div>
      {treated && <p className="text-sm">🎂 On us — enjoy!</p>}
      {big && !treated && p.items.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
          {p.items.map((i) => (
            <div key={i.itemId} className="flex justify-between">
              <span>
                {i.fraction[0] !== i.fraction[1] && (
                  <span className="text-muted">
                    {i.fraction[0]}/{i.fraction[1]}{' '}
                  </span>
                )}
                {itemName(i.itemId)}
              </span>
              <span className="tabular-nums">{fmt(i.share)}</span>
            </div>
          ))}
          <div className="flex justify-between text-muted">
            <span>Tax, tip &amp; extras</span>
            <span className="tabular-nums">{fmt(p.total - p.subtotal)}</span>
          </div>
        </div>
      )}
    </Card>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-5 px-4 py-6">
      <div className="flex items-center justify-center gap-2">
        <Logo size={28} />
        <span className="font-rounded text-xl font-extrabold text-brand">Tabby</span>
      </div>
      {children}
    </div>
  )
}
