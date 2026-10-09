import { describe, expect, it } from 'vitest'
import { createBill, makeItem } from '../src/lib/bill'
import { parseBill } from '../src/lib/schema'

describe('parseBill', () => {
  it('upgrades bills saved before splitMode existed', () => {
    const { splitMode: _omit, ...old } = { ...createBill(), mode: 'itemized' }
    const item = { ...makeItem('Fries', 600), source: 'sample' }
    const parsed = parseBill({ ...old, items: [item] })
    expect(parsed?.splitMode).toBe('fair')
    expect(parsed?.items[0].source).toBe('manual')
    expect(parsed && 'mode' in parsed).toBe(false)
  })

  it('rejects corrupt data instead of crashing', () => {
    expect(parseBill({ nope: true })).toBeNull()
  })
})
