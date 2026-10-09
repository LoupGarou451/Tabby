import { minorDigits, toMinor, type Money } from '../lib/money'

export interface OcrLine {
  text: string
  confidence: number // 0–100
  x0?: number // left edge in px, used to spot indented modifier lines
}

export interface DraftItem {
  name: string
  quantity: number
  price: Money
  confidence: number
}

export interface ReceiptDraft {
  items: DraftItem[]
  subtotal?: Money
  tax?: Money
  tip?: Money
  serviceCharge?: Money
  discount?: Money
  total?: Money
}

// Lines that never hold an item: payment, metadata, and pleasantries.
const NOISE =
  /\b(change|cash|visa|master ?card|amex|american express|discover|debit|credit|card|auth|approv|table|server|guests?|check ?#?|order ?#|thank|tel|phone|www|http|merchant|terminal|ref(erence)?|trans(action)?|items? ?count|signature)\b/i
const CARD = /\*{2,}|x{4,}\s?\d{4}|#{3,}/i
const DATE = /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/
const TIME = /\b\d{1,2}:\d{2}\b/
const PHONE = /\(?\d{3}\)?[\s.-]\d{3}[.-]\d{4}/

/** Undo common OCR letter/digit swaps so keywords like "T0TAL" or "5ubtotal" still match. */
function keywordForm(label: string): string {
  return label
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/[1|!]/g, 'l')
    .replace(/5/g, 's')
    .replace(/8/g, 'b')
    .replace(/\s+/g, ' ')
}

type Kind = 'subtotal' | 'tax' | 'tip' | 'service' | 'discount' | 'total' | 'item'

function classify(label: string): Kind {
  const k = keywordForm(label)
  if (/\bsub ?-?tota?l\b/.test(k)) return 'subtotal'
  if (/\b(tax|vat|gst|hst|pst)\b/.test(k)) return 'tax'
  if (/\b(gratuity|service( charge)?|svc)\b/.test(k)) return 'service'
  if (/\btip\b/.test(k)) return 'tip'
  if (/\b(discount|comp|coupon|promo)\b/.test(k)) return 'discount'
  if (/\b(total|amount due|amt due|balance( due)?)\b/.test(k)) return 'total'
  return 'item'
}

/** Builds the trailing-price pattern for a currency's number of decimals. */
function pricePattern(digits: number): RegExp {
  const frac = digits > 0 ? `[.,]\\s?\\d{${digits}}` : ''
  // label … [-][$]1,234.56[-] [tax flag like T, F, TX]
  return new RegExp(
    `^(.*?)[\\s.:]+(-)?\\s?[$€£¥₹]?\\s?(\\d{1,3}(?:[,.\\s]\\d{3})*|\\d+)(${frac})\\s?(-)?\\s?[A-Z]{0,2}$`,
  )
}

function parseAmount(intPart: string, fracPart: string, currency: string): Money {
  const whole = intPart.replace(/[,.\s]/g, '')
  const frac = fracPart.replace(/[.,\s]/g, '')
  return toMinor(Number(`${whole}.${frac || '0'}`), currency)
}

/** Leading quantity: "2 x Beer", "2x Beer", "2 @ 4.00 Beer", "2 Beer". */
function splitQuantity(label: string): { quantity: number; name: string } {
  const m = label.match(/^(\d{1,2})\s*(?:[xX×]|@\s*\$?\d+[.,]\d{2})?\s+(.+)$/)
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 50 && /[a-z]/i.test(m[2])) {
    return { quantity: Number(m[1]), name: m[2] }
  }
  const trailing = label.match(/^(.+?)\s+[xX×]\s?(\d{1,2})$/)
  if (trailing) return { quantity: Number(trailing[2]), name: trailing[1] }
  return { quantity: 1, name: label }
}

function cleanName(name: string): string {
  return name
    .replace(/^[\s+*•·.:-]+|[\s.:$-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Turns OCR lines into draft items and receipt totals (TABBY_DESIGN.md section 9.1).
 * Pure and deterministic; it's tested against realistic OCR output.
 */
export function parseReceipt(lines: OcrLine[], currency: string): ReceiptDraft {
  const draft: ReceiptDraft = { items: [] }
  const pattern = pricePattern(minorDigits(currency))
  let lastItemX: number | undefined
  let afterTotal = false

  for (const raw of lines) {
    const text = raw.text.replace(/\s+/g, ' ').trim()
    if (!text) continue
    const m = text.match(pattern)
    if (!m) continue

    const [, rawLabel, minusBefore, intPart, fracPart, minusAfter] = m
    const label = rawLabel.trim()
    const negative = !!(minusBefore || minusAfter)
    const amount = parseAmount(intPart, fracPart, currency)
    if (!label || amount === 0) continue

    const kind = classify(label)
    const keywordText = keywordForm(label)

    if (kind !== 'item') {
      switch (kind) {
        case 'subtotal':
          draft.subtotal = amount
          break
        case 'tax':
          draft.tax = (draft.tax ?? 0) + amount
          break
        case 'service':
          draft.serviceCharge = (draft.serviceCharge ?? 0) + amount
          break
        case 'tip':
          // "Suggested tip 18%: 24.30" is advice, not a charge.
          if (!/%|suggest/.test(keywordText)) draft.tip = amount
          break
        case 'discount':
          draft.discount = (draft.discount ?? 0) + amount
          break
        case 'total':
          draft.total ??= amount
          afterTotal = true
          break
      }
      continue
    }

    if (afterTotal) continue // payment lines, change, etc.
    if (
      NOISE.test(label) ||
      CARD.test(text) ||
      DATE.test(text) ||
      TIME.test(text) ||
      PHONE.test(text)
    )
      continue

    if (negative) {
      draft.discount = (draft.discount ?? 0) + amount
      continue
    }

    // Modifiers ("+ avocado 2.00", or a line indented under its item) add to the item above.
    const prev = draft.items[draft.items.length - 1]
    const indented = raw.x0 !== undefined && lastItemX !== undefined && raw.x0 - lastItemX > 24
    if (prev && (/^[+]/.test(label) || indented)) {
      const mod = cleanName(label)
      if (mod) prev.name = `${prev.name} + ${mod}`
      prev.price += amount
      prev.confidence = Math.min(prev.confidence, raw.confidence)
      continue
    }

    const { quantity, name } = splitQuantity(label)
    const cleaned = cleanName(name)
    if (!/[a-z]{2}/i.test(cleaned)) continue // just digits/symbols: not an item
    draft.items.push({ name: cleaned, quantity, price: amount, confidence: raw.confidence })
    lastItemX = raw.x0
  }

  return draft
}
