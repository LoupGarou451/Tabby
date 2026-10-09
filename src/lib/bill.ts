import type { Bill, Item, Person } from './types'

/**
 * Random id. crypto.randomUUID() only exists in secure contexts, and phones opening the dev
 * server over the LAN (http://192.168.…) aren't one; getRandomValues works everywhere.
 */
export const newId = (): string =>
  crypto.randomUUID?.() ??
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')

/** Neutral default name, e.g. "Bill · Oct 9" — no guessing about the meal. */
export function defaultTitle(date = new Date()): string {
  return `Bill · ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

export function createBill(opts: { currency?: string; now?: Date } = {}): Bill {
  const now = (opts.now ?? new Date()).toISOString()
  return {
    schemaVersion: 1,
    id: newId(),
    splitMode: 'fair',
    title: defaultTitle(opts.now),
    createdAt: now,
    updatedAt: now,
    currency: opts.currency ?? 'USD',
    roundUp: false,
    people: [],
    items: [],
    adjustments: {
      tax: { mode: 'amount', value: 0 },
      // No tip until one is picked on Tax & tip, so earlier totals match the receipt.
      tip: { mode: 'percent', bps: 0 },
      tipBase: 'preTax',
      serviceCharge: 0,
      discount: 0,
    },
    treatedIds: [],
    paid: {},
  }
}

export function makeItem(
  name: string,
  price: number,
  quantity = 1,
  source: Item['source'] = 'manual',
): Item {
  return { id: newId(), name, price, quantity, shares: {}, source }
}

export function makePerson(name: string, colorIndex: number): Person {
  return { id: newId(), name, colorIndex: colorIndex % 10 }
}
