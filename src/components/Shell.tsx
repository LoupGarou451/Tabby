import { useEffect, useState } from 'react'
import { Logo } from '../brand/Logo'
import { formatMoney } from '../lib/money'
import { useBill, isAssigned } from '../store/billStore'
import { STEPS, useUi, type Step } from '../store/uiStore'
import { useSplit } from '../store/useSplit'
import { Button, Sheet } from './ui'
import { cx } from '../lib/cx'

const STEP_LABELS: Record<Step, string> = {
  receipt: 'Receipt',
  people: 'People',
  assign: 'Assign',
  tip: 'Tax & tip',
  summary: 'Summary',
}

export function Header() {
  const title = useBill((s) => s.bill.title)
  const currency = useBill((s) => s.bill.currency)
  const setTitle = useBill((s) => s.setTitle)
  const openSheet = useUi((s) => s.openSheet)
  const [text, setText] = useState(title)
  const [focused, setFocused] = useState(false)
  if (!focused && text !== title) setText(title)

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[480px] items-center gap-2 px-3">
        <Logo size={30} />
        <input
          aria-label="Bill title"
          value={text}
          onFocus={(e) => {
            setFocused(true)
            e.currentTarget.select()
          }}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            setFocused(false)
            setTitle(text.trim() || title)
          }}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="min-h-10 min-w-0 flex-1 truncate rounded-lg bg-transparent px-2 font-semibold outline-none focus:bg-surface-2"
        />
        <button
          type="button"
          onClick={() => openSheet('currency')}
          aria-label={`Currency: ${currency}. Change currency`}
          className="min-h-10 rounded-full border border-line px-3 text-sm font-semibold"
        >
          {currency} ▾
        </button>
        <Button
          variant="ghost"
          aria-label="Menu"
          onClick={() => openSheet('menu')}
          className="px-3"
        >
          ☰
        </Button>
      </div>
    </header>
  )
}

export function BottomBar() {
  const step = useUi((s) => s.step)
  const setStep = useUi((s) => s.setStep)
  const bill = useBill((s) => s.bill)
  const split = useSplit()
  const fmt = (m: number) => formatMoney(m, bill.currency)
  const index = STEPS.indexOf(step)
  const next = STEPS[index + 1]

  const unassigned = bill.items.filter((i) => !isAssigned(i, bill.people))
  const unassignedTotal = unassigned.reduce((s, i) => s + i.price, 0)
  const status = (() => {
    switch (step) {
      case 'receipt':
        return `${bill.items.length} ${bill.items.length === 1 ? 'item' : 'items'} · ${fmt(split.itemsSubtotal)}`
      case 'people':
        return `${bill.people.length} ${bill.people.length === 1 ? 'person' : 'people'}`
      case 'assign':
        return bill.items.length && !unassigned.length ? (
          <span className="text-good">✓ All assigned</span>
        ) : (
          `Unassigned: ${fmt(unassignedTotal)}`
        )
      default:
        return `Total ${fmt(split.billTotal)}`
    }
  })()

  return (
    <nav
      aria-label="Steps"
      className="sticky bottom-0 z-10 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-[480px] flex-col gap-2 px-3 pt-2 pb-2">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-sm font-medium tabular-nums">{status}</span>
          {next && (
            <Button variant="primary" onClick={() => setStep(next)} className="shrink-0">
              Next: {STEP_LABELS[next]} →
            </Button>
          )}
        </div>
        <ol className="flex justify-between">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => setStep(s)}
                aria-current={s === step ? 'step' : undefined}
                className={cx(
                  'flex min-h-9 items-center gap-1.5 rounded-full px-2 text-xs font-medium',
                  s === step ? 'text-ink' : 'text-muted',
                )}
              >
                <span
                  className={cx(
                    'h-2 w-2 rounded-full',
                    i <= index ? 'bg-brand' : 'bg-line',
                    s === step && 'ring-2 ring-brand/40',
                  )}
                />
                {STEP_LABELS[s]}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}

export function Snackbar() {
  const undo = useBill((s) => s.undo)
  const applyUndo = useBill((s) => s.applyUndo)
  const clearUndo = useBill((s) => s.clearUndo)
  useEffect(() => {
    if (!undo) return
    const t = setTimeout(clearUndo, 5000)
    return () => clearTimeout(t)
  }, [undo, clearUndo])
  if (!undo) return null
  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-28 z-20 mx-auto flex max-w-[456px] items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-2 text-bg shadow-lg"
    >
      <span className="text-sm">{undo.message}</span>
      <button type="button" onClick={applyUndo} className="min-h-10 px-2 font-semibold text-brand">
        Undo
      </button>
    </div>
  )
}

export function MenuSheet() {
  const sheet = useUi((s) => s.sheet)
  const openSheet = useUi((s) => s.openSheet)
  const setStep = useUi((s) => s.setStep)
  const setEditing = useUi((s) => s.setEditingItems)
  const newBill = useBill((s) => s.newBill)
  const close = () => openSheet(null)

  const item = (icon: string, label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left font-medium hover:bg-surface-2"
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  )

  return (
    <Sheet open={sheet === 'menu'} onClose={close} title="Menu">
      <div className="flex flex-col gap-1">
        {item('🧾', 'New bill', () => {
          newBill()
          setEditing(false)
          setStep('receipt')
          close()
        })}
        {item('ℹ️', 'About Tabby', () => openSheet('about'))}
      </div>
    </Sheet>
  )
}

export function AboutSheet() {
  const sheet = useUi((s) => s.sheet)
  const openSheet = useUi((s) => s.openSheet)
  return (
    <Sheet open={sheet === 'about'} onClose={() => openSheet(null)} title="About">
      <div className="flex flex-col items-center gap-2 text-center">
        <Logo size={72} />
        <p className="font-rounded text-2xl font-extrabold text-brand">Tabby</p>
        <p className="text-sm text-muted">Version {__APP_VERSION__}</p>
        <p>Split the tab. Everything stays on your device.</p>
        <p className="text-sm text-muted">MIT License · © 2026 Jeff Fulton</p>
        <div className="mt-2 flex flex-col gap-1 text-sm">
          <a className="text-brand-strong underline" href="https://github.com/LoupGarou451/Tabby">
            Source on GitHub
          </a>
          <a className="text-brand-strong underline" href="https://loupgarou451.github.io/Tabby/">
            Open the public app
          </a>
        </div>
      </div>
    </Sheet>
  )
}
