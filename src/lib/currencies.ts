export const COMMON_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'MXN',
  'JPY',
  'INR',
  'CHF',
  'CNY',
]

export interface CurrencyOption {
  code: string
  name: string
  symbol: string
}

let cache: CurrencyOption[] | null = null

/** Every currency the browser knows, with localized names. No library, no network. */
export function allCurrencies(locale?: string): CurrencyOption[] {
  if (cache) return cache
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
  let codes: string[]
  try {
    codes = intl.supportedValuesOf?.('currency') ?? COMMON_CURRENCIES
  } catch {
    codes = COMMON_CURRENCIES
  }
  const names = new Intl.DisplayNames(locale ? [locale] : undefined, { type: 'currency' })
  cache = codes.map((code) => ({
    code,
    name: names.of(code) ?? code,
    symbol: symbolOf(code, locale),
  }))
  return cache
}

export function symbolOf(currency: string, locale?: string): string {
  try {
    return (
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
      })
        .formatToParts(0)
        .find((p) => p.type === 'currency')?.value ?? currency
    )
  } catch {
    return currency
  }
}

export function searchCurrencies(query: string, list = allCurrencies()): CurrencyOption[] {
  const q = query.trim().toLowerCase()
  if (!q) return list
  return list.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol === query.trim(),
  )
}
