import { z } from 'zod'
import type { Bill } from './types'

const money = z.number().int()

const amount = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('amount'), value: money.nonnegative() }),
  z.object({ mode: z.literal('percent'), bps: z.number().int().nonnegative() }),
])

const person = z.object({
  id: z.string(),
  name: z.string(),
  colorIndex: z.number().int().min(0).max(9),
})

const item = z.object({
  id: z.string(),
  name: z.string(),
  price: money.positive(),
  quantity: z.number().int().min(1),
  shares: z.record(z.string(), z.number().int().min(0).max(10)),
  source: z.enum(['manual', 'scan', 'sample']),
  confidence: z.number().optional(),
})

export const billSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  mode: z.enum(['itemized', 'quick']),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  currency: z.string().length(3),
  quick: z
    .object({
      total: money.nonnegative(),
      tax: money.nonnegative(),
      headcount: z.number().int().min(1),
    })
    .optional(),
  roundUp: z.boolean(),
  people: z.array(person),
  items: z.array(item),
  adjustments: z.object({
    tax: amount,
    tip: amount,
    tipBase: z.enum(['preTax', 'postTax']),
    serviceCharge: money.nonnegative(),
    discount: money.nonnegative(),
  }),
  printedTotal: money.nonnegative().optional(),
  payerId: z.string().optional(),
  treatedIds: z.array(z.string()),
  paid: z.record(z.string(), z.boolean()),
}) satisfies z.ZodType<Bill>

/** Returns the bill if it matches the current schema, otherwise null. */
export function parseBill(data: unknown): Bill | null {
  const r = billSchema.safeParse(data)
  if (!r.success) console.warn('[tabby] ignoring invalid bill data', r.error.issues)
  return r.success ? r.data : null
}
