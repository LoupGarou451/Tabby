import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { z } from 'zod'
import { formatPlain, type Money } from './money'
import { newId } from './bill'
import { billSchema } from './schema'
import type { Bill } from './types'

/** Public deployment (GitHub Pages). Bills travel in the #hash, which is never sent to it. */
export const PUBLIC_URL = 'https://loupgarou451.github.io/Tabby/'

export interface PayHandles {
  venmo?: string
  cashtag?: string
}

export interface SharePayload {
  v: 1
  bill: Bill
  handles: PayHandles
}

/*
 * Compact wire format: positions instead of ids, arrays instead of objects. A typical
 * 8-item, 4-person bill compresses to ~300 characters, small enough for a phone-readable QR.
 */
const amountWire = z.union([
  z.tuple([z.literal(0), z.number().int().nonnegative()]), // amount
  z.tuple([z.literal(1), z.number().int().nonnegative()]), // percent (bps)
])
const wireSchema = z.object({
  v: z.literal(1),
  t: z.string(),
  c: z.string().length(3),
  m: z.enum(['fair', 'even']),
  r: z.literal(1).optional(), // round up
  p: z.array(z.tuple([z.string(), z.number().int().min(0).max(9)])), // [name, colorIndex]
  i: z.array(
    z.tuple([
      z.string(),
      z.number().int().positive(),
      z.number().int().min(1),
      z.array(z.number().int().min(0).max(10)),
    ]),
  ), // [name, price, quantity, weight per person]
  a: z.tuple([
    amountWire,
    amountWire,
    z.enum(['preTax', 'postTax']),
    z.number().int(),
    z.number().int(),
  ]),
  y: z.number().int().optional(), // payer index
  x: z.array(z.number().int()).optional(), // treated indexes
  h: z.tuple([z.string(), z.string()]).optional(), // [venmo, cashtag]
})
type Wire = z.infer<typeof wireSchema>

const toWireAmount = (a: Bill['adjustments']['tax']): [0 | 1, number] =>
  a.mode === 'amount' ? [0, a.value] : [1, a.bps]
const fromWireAmount = ([kind, n]: [0 | 1, number]): Bill['adjustments']['tax'] =>
  kind === 0 ? { mode: 'amount', value: n } : { mode: 'percent', bps: n }

export function encodeShare(bill: Bill, handles: PayHandles): string {
  const index = new Map(bill.people.map((p, k) => [p.id, k]))
  const adj = bill.adjustments
  const wire: Wire = {
    v: 1,
    t: bill.title,
    c: bill.currency,
    m: bill.splitMode,
    p: bill.people.map((p) => [p.name, p.colorIndex]),
    i: bill.items.map((i) => [
      i.name,
      i.price,
      i.quantity,
      bill.people.map((p) => i.shares[p.id] ?? 0),
    ]),
    a: [toWireAmount(adj.tax), toWireAmount(adj.tip), adj.tipBase, adj.serviceCharge, adj.discount],
  }
  if (bill.roundUp) wire.r = 1
  if (bill.payerId && index.has(bill.payerId)) wire.y = index.get(bill.payerId)
  const treated = bill.treatedIds.filter((id) => index.has(id)).map((id) => index.get(id)!)
  if (treated.length) wire.x = treated
  if (handles.venmo || handles.cashtag) wire.h = [handles.venmo ?? '', handles.cashtag ?? '']
  // "Paid" checkmarks are the organizer's private bookkeeping, so they're never shared.
  return compressToEncodedURIComponent(JSON.stringify(wire))
}

function fromWire(w: Wire): SharePayload | null {
  const now = new Date().toISOString()
  const people = w.p.map(([name, colorIndex]) => ({ id: newId(), name, colorIndex }))
  const bill: Bill = {
    schemaVersion: 1,
    id: newId(),
    splitMode: w.m,
    title: w.t,
    createdAt: now,
    updatedAt: now,
    currency: w.c,
    roundUp: w.r === 1,
    people,
    items: w.i.map(([name, price, quantity, weights]) => ({
      id: newId(),
      name,
      price,
      quantity,
      source: 'manual' as const,
      shares: Object.fromEntries(
        weights.flatMap((wt, k) => (wt > 0 && people[k] ? [[people[k].id, wt]] : [])),
      ),
    })),
    adjustments: {
      tax: fromWireAmount(w.a[0]),
      tip: fromWireAmount(w.a[1]),
      tipBase: w.a[2],
      serviceCharge: w.a[3],
      discount: w.a[4],
    },
    payerId: w.y !== undefined ? people[w.y]?.id : undefined,
    treatedIds: (w.x ?? []).flatMap((k) => (people[k] ? [people[k].id] : [])),
    paid: {},
  }
  const valid = billSchema.safeParse(bill)
  if (!valid.success) return null
  const handles = w.h ? { venmo: w.h[0] || undefined, cashtag: w.h[1] || undefined } : {}
  return { v: 1, bill: valid.data, handles }
}

/** Returns the payload in a `#b=…` hash, or null if it's missing, corrupt, or from another version. */
export function decodeShare(hash: string): SharePayload | null {
  const data = hash.startsWith('#b=') ? hash.slice(3) : null
  if (!data) return null
  try {
    const parsed = wireSchema.safeParse(JSON.parse(decompressFromEncodedURIComponent(data) ?? ''))
    return parsed.success ? fromWire(parsed.data) : null
  } catch {
    return null
  }
}

export const isShareHash = (hash: string) => hash.startsWith('#b=')

const isLocalHost = (host: string) => ['localhost', '127.0.0.1', '[::1]', '::1'].includes(host)

export type ShareTarget = 'public' | 'local'

/**
 * Where a share link should point. On a reachable origin (Pages, a LAN IP) that's just the
 * current page; on localhost it's the public site, or this machine's LAN address.
 */
/** This machine's address on the local network, using the port the page was served from. */
export function lanUrl(
  loc: { protocol: string; port: string; pathname: string } = location,
  host: string | null = __LAN_HOST__,
): string | null {
  return host ? `${loc.protocol}//${host}${loc.port ? `:${loc.port}` : ''}${loc.pathname}` : null
}

export function shareBase(
  target: ShareTarget,
  loc: {
    hostname: string
    origin: string
    pathname: string
    protocol: string
    port: string
  } = location,
  lan: string | null = lanUrl(loc),
): { url: string; choice: boolean } {
  if (!isLocalHost(loc.hostname)) return { url: loc.origin + loc.pathname, choice: false }
  return { url: target === 'local' && lan ? lan : PUBLIC_URL, choice: true }
}

export const shareUrl = (base: string, encoded: string) => `${base}#b=${encoded}`

/** Payment app deep links. Venmo is USD-only; Cash App supports USD and GBP. */
export function paymentLinks(
  currency: string,
  handles: PayHandles,
  amount: Money,
  note: string,
): { label: string; href: string }[] {
  const value = formatPlain(amount, currency)
  const links: { label: string; href: string }[] = []
  const venmo = handles.venmo?.replace(/^@/, '').trim()
  const cashtag = handles.cashtag?.replace(/^\$/, '').trim()
  if (venmo && currency === 'USD')
    links.push({
      label: 'Venmo',
      href: `https://venmo.com/${encodeURIComponent(venmo)}?txn=pay&amount=${value}&note=${encodeURIComponent(note)}`,
    })
  if (cashtag && (currency === 'USD' || currency === 'GBP'))
    links.push({
      label: 'Cash App',
      href: `https://cash.app/$${encodeURIComponent(cashtag)}/${value}`,
    })
  return links
}
