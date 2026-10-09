import { useEffect } from 'react'
import { Logo } from '../brand/Logo'
import { formatMoney } from '../lib/money'
import { useBill, isAssigned } from '../store/billStore'
import { STEPS, useUi, type Step } from '../store/uiStore'
import { useSplit } from '../store/useSplit'
import { Button, Sheet } from './ui'
import { cx } from '../lib/cx'
import { canReach, stepBlocker } from '../lib/steps'

const STEP_LABELS: Record<Step, string> = {
  receipt: 'Receipt',
  people: 'People',
  assign: 'Assign',
  tip: 'Tax & tip',
  summary: 'Summary',
}

/** Takes the user home (Step 1). Asks first if that would set aside a bill in progress. */
function useGoHome() {
  const hasContent = useBill((s) => s.bill.items.length > 0 || s.bill.people.length > 0)
  const openSheet = useUi((s) => s.openSheet)
  const setStep = useUi((s) => s.setStep)
  const setEditing = useUi((s) => s.setEditingItems)
  return () => {
    if (hasContent) return openSheet('startOver')
    setEditing(false)
    setStep('receipt')
    openSheet(null)
  }
}

export function Header() {
  const currency = useBill((s) => s.bill.currency)
  const openSheet = useUi((s) => s.openSheet)
  const goHome = useGoHome()

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[480px] items-center gap-2 px-3">
        <button
          type="button"
          onClick={goHome}
          aria-label="Tabby — start over"
          className="-ml-1 flex min-h-11 flex-1 items-center gap-2 rounded-lg px-1"
        >
          <Logo size={30} />
          <span className="font-rounded text-xl font-extrabold text-brand">Tabby</span>
        </button>
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

/** "Start over?" confirmation used by the header and the menu's New bill. */
export function StartOverSheet() {
  const open = useUi((s) => s.sheet === 'startOver')
  const openSheet = useUi((s) => s.openSheet)
  const setStep = useUi((s) => s.setStep)
  const setEditing = useUi((s) => s.setEditingItems)
  const newBill = useBill((s) => s.newBill)
  const hasItems = useBill((s) => s.bill.items.length > 0)
  const close = () => openSheet(null)

  return (
    <Sheet open={open} onClose={close} title="Start over?">
      <div className="flex flex-col gap-4">
        <p className="text-muted">
          {hasItems
            ? 'Your current receipt will be saved to Bill history, so you can come back to it.'
            : "The people you've added will be cleared."}
        </p>
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            className="min-h-12"
            onClick={() => {
              newBill()
              setEditing(false)
              setStep('receipt')
              close()
            }}
          >
            Start over
          </Button>
          <Button onClick={close}>Keep editing</Button>
        </div>
      </div>
    </Sheet>
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
  const blocker = stepBlocker(bill, step)

  const unassigned = bill.items.filter((i) => !isAssigned(i, bill.people))
  const unassignedTotal = unassigned.reduce((s, i) => s + i.price, 0)
  const status = (() => {
    switch (step) {
      case 'receipt':
        return `${bill.items.length} ${bill.items.length === 1 ? 'item' : 'items'} · ${fmt(split.itemsSubtotal)}`
      case 'people':
        return `${bill.people.length} ${bill.people.length === 1 ? 'person' : 'people'}`
      case 'assign':
        if (bill.splitMode === 'even') return 'Splitting evenly'
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
          <span
            id="step-status"
            role="status"
            className={cx(
              'min-w-0 text-sm font-medium tabular-nums',
              blocker ? 'text-warn' : 'truncate',
            )}
          >
            {blocker ?? status}
          </span>
          {next && (
            <Button
              variant="primary"
              onClick={() => setStep(next)}
              disabled={!!blocker}
              aria-describedby={blocker ? 'step-status' : undefined}
              className="shrink-0"
            >
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
                // Later steps unlock once every step before them is complete.
                disabled={!canReach(bill, s)}
                aria-current={s === step ? 'step' : undefined}
                className={cx(
                  'flex min-h-9 items-center gap-1.5 rounded-full px-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40',
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
      <button
        type="button"
        onClick={applyUndo}
        className="min-h-10 px-2 font-semibold text-ink-accent"
      >
        Undo
      </button>
    </div>
  )
}

export function MenuSheet() {
  const sheet = useUi((s) => s.sheet)
  const openSheet = useUi((s) => s.openSheet)
  const goHome = useGoHome()
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
        {item('🧾', 'New bill', goHome)}
        {item('🗂️', 'Bill history', () => openSheet('history'))}
        {item('⚙️', 'Settings', () => openSheet('settings'))}
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
