import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react'
import { formatPlain, parseMoney, type Money } from '../lib/money'
import { cx } from '../lib/cx'
import { avatarColor, initials } from '../lib/palette'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary:
    'bg-brand text-on-brand font-semibold shadow-sm hover:brightness-105 active:brightness-95',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2',
  ghost: 'text-ink hover:bg-surface-2',
  danger: 'text-bad hover:bg-surface-2',
}

const LEADING_EMOJI = /^(\p{Extended_Pictographic}\uFE0F?)\s+(.*)$/su

export function Button({
  variant = 'secondary',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  // "📷 Take photo" → icon + label, so the gap spaces them evenly and screen readers skip the icon.
  const m = typeof children === 'string' ? children.match(LEADING_EMOJI) : null
  return (
    <button
      type="button"
      className={cx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] transition disabled:cursor-not-allowed disabled:opacity-40',
        variants[variant],
        className,
      )}
      {...props}
    >
      {m ? (
        <>
          <span aria-hidden="true">{m[1]}</span>
          <span>{m[2]}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx('rounded-2xl border border-line bg-surface p-4 shadow-sm', className)}>
      {children}
    </div>
  )
}

export function Avatar({
  name,
  colorIndex,
  size = 32,
}: {
  name: string
  colorIndex: number
  size?: number
}) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        background: avatarColor(colorIndex),
        fontSize: size * 0.4,
      }}
    >
      {initials(name)}
    </span>
  )
}

/** Toggleable person chip: avatar + name. */
export function PersonChip({
  name,
  colorIndex,
  selected,
  onClick,
  suffix,
}: {
  name: string
  colorIndex: number
  selected: boolean
  onClick: () => void
  suffix?: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => {
        navigator.vibrate?.(10)
        onClick()
      }}
      className={cx(
        'inline-flex min-h-11 items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm font-medium transition',
        selected
          ? 'border-transparent text-white'
          : 'border-line bg-surface text-muted hover:text-ink',
      )}
      style={selected ? { background: avatarColor(colorIndex) } : undefined}
    >
      <span
        className={cx(
          'inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
          selected ? 'bg-white/25 text-white' : 'text-white',
        )}
        style={selected ? undefined : { background: avatarColor(colorIndex) }}
      >
        {initials(name)}
      </span>
      {name}
      {suffix}
    </button>
  )
}

/**
 * Money field that keeps the user's raw text while typing and commits a parsed value
 * (in minor units) on blur or Enter. Invalid input shows an inline error.
 */
export function MoneyInput({
  value,
  currency,
  onCommit,
  onEnter,
  allowEmpty = false,
  className,
  ref,
  ...rest
}: {
  value: Money | null
  currency: string
  onCommit: (value: Money | null) => void
  onEnter?: () => void
  allowEmpty?: boolean
  ref?: Ref<HTMLInputElement>
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const shown = value === null ? '' : formatPlain(value, currency)
  const [text, setText] = useState(shown)
  const [error, setError] = useState(false)
  const [focused, setFocused] = useState(false)
  if (!focused && text !== shown && !error) setText(shown)

  const commit = () => {
    if (text.trim() === '') {
      setError(false)
      if (allowEmpty || value === null) onCommit(null)
      else setText(shown)
      return true
    }
    const parsed = parseMoney(text, currency)
    if (parsed === null) {
      setError(true)
      return false
    }
    setError(false)
    onCommit(parsed)
    setText(formatPlain(parsed, currency))
    return true
  }

  return (
    <input
      ref={ref}
      inputMode="decimal"
      autoComplete="off"
      value={text}
      aria-invalid={error || undefined}
      onFocus={(e) => {
        setFocused(true)
        e.currentTarget.select()
      }}
      onChange={(e) => {
        setText(e.target.value)
        setError(false)
      }}
      onBlur={() => {
        setFocused(false)
        commit()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && commit()) onEnter?.()
      }}
      className={cx(
        'min-h-11 rounded-xl border bg-surface px-3 text-right tabular-nums outline-none focus:border-brand',
        error ? 'border-bad' : 'border-line',
        className,
      )}
      {...rest}
    />
  )
}

/** Bottom sheet built on <dialog>: focus trap, Esc to close, and focus restore for free. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      // <dialog> focuses its first focusable (the close button); prefer a marked field.
      d.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 outline-none backdrop:bg-black/40 sm:m-auto sm:max-w-[480px]"
    >
      <div className="mx-auto max-h-[85dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <Button variant="ghost" aria-label="Close" onClick={onClose} className="-mr-2 px-3">
            ✕
          </Button>
        </div>
        {children}
      </div>
    </dialog>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'min-h-10 flex-1 rounded-lg px-3 text-sm font-medium transition',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-7 w-12 shrink-0 rounded-full transition',
          checked ? 'bg-brand' : 'bg-line',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
    </label>
  )
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <div className="text-4xl" aria-hidden="true">
        {icon}
      </div>
      <p className="font-semibold">{title}</p>
      {children}
    </div>
  )
}
