import { makeItem } from '../../src/lib/bill'

/** The sample receipt used by tests (TABBY_DESIGN.md section 11). Prices in cents, USD. */
export const SAMPLE_ITEMS: [name: string, qty: number, price: number][] = [
  ['Truffle Fries', 1, 1200],
  ['Burrata', 1, 1650],
  ['Margherita Pizza', 1, 1900],
  ['Steak Frites', 1, 3400],
  ['Caesar Salad', 1, 1400],
  ['House Red (bottle)', 1, 4800],
  ['Sparkling Water', 2, 800],
  ['Tiramisu', 1, 1100],
]
export const SAMPLE_TAX = 1442
export const SAMPLE_TOTAL = 17692
export const SAMPLE_PEOPLE = ['Alex', 'Sam', 'Priya', 'Jordan']

export const sampleItems = () => SAMPLE_ITEMS.map(([n, q, p]) => makeItem(n, p, q))
