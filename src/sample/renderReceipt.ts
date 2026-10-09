import { formatPlain } from '../lib/money'
import { SAMPLE_ITEMS, SAMPLE_TAX, SAMPLE_TOTAL } from './sampleBill'

/**
 * Draws the sample receipt as a slightly skewed, noisy "photo" so the real OCR pipeline
 * can be tried without a camera — and without shipping any receipt images.
 */
export function renderSampleReceipt(): HTMLCanvasElement {
  const money = (m: number) => formatPlain(m, 'USD')
  const subtotal = SAMPLE_ITEMS.reduce((s, [, , p]) => s + p, 0)
  const row = (label: string, amount: string) => `${label.padEnd(24)}${amount.padStart(8)}`
  const lines = [
    '      THE CORNER BISTRO',
    '   123 Main St, Springfield',
    '      (555) 123-4567',
    '',
    'Table 12        Server: Dana',
    '10/08/2026           7:42 PM',
    '--------------------------------',
    ...SAMPLE_ITEMS.map(([name, qty, price]) =>
      row(qty > 1 ? `${qty} ${name}` : name, money(price)),
    ),
    '--------------------------------',
    row('Subtotal', money(subtotal)),
    row('Tax 8.875%', money(SAMPLE_TAX)),
    row('Total', money(SAMPLE_TOTAL)),
    '',
    '      Thank you, come again!',
  ]

  const scale = 2
  const lineH = 30 * scale
  const width = 560 * scale
  const height = (lines.length * 30 + 80) * scale
  const canvas = document.createElement('canvas')
  canvas.width = width + 160
  canvas.height = height + 160
  const ctx = canvas.getContext('2d')!

  // Table-ish background, then the paper, slightly rotated.
  ctx.fillStyle = '#6b5a4a'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(-0.012)
  ctx.translate(-width / 2, -height / 2)
  ctx.fillStyle = '#f7f3ea'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#26221d'
  ctx.font = `${20 * scale}px "Courier New", Courier, monospace`
  ctx.textBaseline = 'top'
  lines.forEach((l, i) => ctx.fillText(l, 24 * scale, 40 * scale + i * lineH))

  // A soft shadow across one corner and some speckle noise.
  const g = ctx.createLinearGradient(0, 0, width, height)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(0,0,0,0.12)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, width, height)
  let seed = 7
  for (let i = 0; i < 1500; i++) {
    seed = (seed * 16807) % 2147483647
    const x = seed % width
    seed = (seed * 16807) % 2147483647
    const y = seed % height
    ctx.fillStyle = `rgba(0,0,0,${(seed % 12) / 100})`
    ctx.fillRect(x, y, 2, 2)
  }
  return canvas
}
