/** Integer amount in the currency's minor unit (cents for USD, yen for JPY, fils for BHD). */
export type Money = number

const digitsCache = new Map<string, number>()

/** Number of decimal places the currency uses (0, 2, or 3). */
export function minorDigits(currency: string): number {
  let d = digitsCache.get(currency)
  if (d === undefined) {
    try {
      d =
        new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
          .maximumFractionDigits ?? 2
    } catch {
      d = 2
    }
    digitsCache.set(currency, d)
  }
  return d
}

/** Converts a decimal amount (e.g. 12.5) to minor units, rounding half away from zero. */
export function toMinor(major: number, currency: string): Money {
  const scaled = major * 10 ** minorDigits(currency)
  return Math.sign(scaled) * Math.round(Math.abs(scaled) + 1e-9)
}

export function toMajor(minor: Money, currency: string): number {
  return minor / 10 ** minorDigits(currency)
}

/** The step totals round up to: one whole unit, or 10 for currencies without decimals. */
export function roundingUnit(currency: string): Money {
  const d = minorDigits(currency)
  return d === 0 ? 10 : 10 ** d
}

/** `base × bps / 10000`, rounded to the nearest minor unit. 2000 bps = 20%. */
export function percentOf(base: Money, bps: number): Money {
  return Math.round((base * bps) / 10000)
}

/**
 * Splits `total` across `weights` so the parts sum exactly to `total` (largest-remainder
 * method). Leftover units go to the largest fractional remainders; ties go to the
 * earlier index. All-zero weights return all zeros.
 */
export function allocate(total: Money, weights: number[]): Money[] {
  const sum = weights.reduce((a, w) => a + w, 0)
  if (sum <= 0 || total === 0) return weights.map(() => 0)
  const sign = total < 0 ? -1 : 1
  const abs = Math.abs(total)
  const exact = weights.map((w) => (abs * w) / sum)
  const parts = exact.map(Math.floor)
  let leftover = abs - parts.reduce((a, p) => a + p, 0)
  const order = exact
    .map((x, i) => ({ i, rem: x - Math.floor(x) }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i)
  for (let k = 0; leftover > 0; k++, leftover--) parts[order[k % order.length].i]++
  return parts.map((p) => p * sign)
}

/**
 * Parses user-typed money ("12", "12.5", "$12.50", "12,50", "1,250.00") into minor units.
 * Returns null for empty, invalid, or negative input.
 */
export function parseMoney(text: string, currency: string): Money | null {
  const cleaned = text.replace(/[^\d.,-]/g, '')
  if (!/\d/.test(cleaned) || cleaned.includes('-')) return null
  const digits = minorDigits(currency)
  const lastDot = cleaned.lastIndexOf('.')
  const lastComma = cleaned.lastIndexOf(',')
  let decimalAt = -1
  if (lastDot >= 0 && lastComma >= 0) {
    decimalAt = Math.max(lastDot, lastComma)
  } else {
    const at = Math.max(lastDot, lastComma)
    const after = cleaned.length - at - 1
    // A lone separator followed by 1–3 digits is a decimal point ("12,50"); otherwise
    // it's a thousands separator ("1,250"). Three digits after a lone separator is
    // ambiguous, so it's a decimal only if the currency uses three decimals.
    const sepCount = cleaned.split(cleaned[at]).length - 1
    if (at >= 0 && sepCount === 1 && after >= 1 && (after <= 2 || (after === 3 && digits === 3))) {
      decimalAt = at
    }
  }
  const intPart = (decimalAt >= 0 ? cleaned.slice(0, decimalAt) : cleaned).replace(/[.,]/g, '')
  const fracPart = decimalAt >= 0 ? cleaned.slice(decimalAt + 1).replace(/[.,]/g, '') : ''
  const value = Number(`${intPart || '0'}.${fracPart || '0'}`)
  if (!Number.isFinite(value)) return null
  return toMinor(value, currency)
}

const formatterCache = new Map<string, Intl.NumberFormat>()

export function formatMoney(minor: Money, currency: string, locale?: string): string {
  const key = `${locale ?? ''}|${currency}`
  let f = formatterCache.get(key)
  if (!f) {
    f = new Intl.NumberFormat(locale, { style: 'currency', currency })
    formatterCache.set(key, f)
  }
  return f.format(toMajor(minor, currency))
}

/** Plain number for input fields ("12.50"), without symbol or grouping. */
export function formatPlain(minor: Money, currency: string): string {
  return toMajor(minor, currency).toFixed(minorDigits(currency))
}
