import { useMemo, useState } from 'react'
import { Sheet } from '../components/ui'
import { cx } from '../lib/cx'
import {
  allCurrencies,
  COMMON_CURRENCIES,
  searchCurrencies,
  type CurrencyOption,
} from '../lib/currencies'
import { useBill } from '../store/billStore'
import { useUi } from '../store/uiStore'

export function CurrencySheet() {
  const open = useUi((s) => s.sheet === 'currency')
  const openSheet = useUi((s) => s.openSheet)
  const current = useBill((s) => s.bill.currency)
  const setCurrency = useBill((s) => s.setCurrency)
  const [query, setQuery] = useState('')

  const all = useMemo(() => (open ? allCurrencies() : []), [open])
  const results = useMemo(() => searchCurrencies(query, all), [query, all])
  const common = COMMON_CURRENCIES.map((code) => all.find((c) => c.code === code)).filter(
    (c): c is CurrencyOption => !!c,
  )
  const close = () => {
    openSheet(null)
    setQuery('')
  }
  const pick = (code: string) => {
    if (code !== current) setCurrency(code)
    close()
  }

  const row = (c: CurrencyOption) => (
    <li key={c.code}>
      <button
        type="button"
        onClick={() => pick(c.code)}
        aria-current={c.code === current || undefined}
        className={cx(
          'flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-surface-2',
          c.code === current && 'bg-surface-2 font-semibold',
        )}
      >
        <span className="w-12 font-mono text-sm font-semibold">{c.code}</span>
        <span className="min-w-0 flex-1 truncate">{c.name}</span>
        <span className="text-muted">{c.symbol}</span>
        {c.code === current && <span className="text-brand-strong">✓</span>}
      </button>
    </li>
  )

  return (
    <Sheet open={open} onClose={close} title="Currency">
      <input
        type="search"
        data-autofocus
        aria-label="Search currencies"
        placeholder="Search — e.g. euro, yen, CAD"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-3 min-h-12 w-full rounded-xl border border-line bg-surface px-4 outline-none focus:border-brand"
      />
      {query ? (
        <ul>
          {results.length ? results.map(row) : <li className="p-3 text-muted">No matches</li>}
        </ul>
      ) : (
        <>
          <h3 className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">
            Common
          </h3>
          <ul className="mb-3">{common.map(row)}</ul>
          <h3 className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">
            All currencies
          </h3>
          <ul>{all.map(row)}</ul>
        </>
      )}
      <p className="mt-3 px-3 text-xs text-muted">
        Changing currency doesn't convert amounts — it changes the symbol on this bill.
      </p>
    </Sheet>
  )
}
