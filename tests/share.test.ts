import { describe, expect, it, vi } from 'vitest'

vi.stubGlobal('__LAN_HOST__', '192.168.1.20')

const { createBill, makeItem, makePerson } = await import('../src/lib/bill')
const { decodeShare, encodeShare, lanUrl, paymentLinks, PUBLIC_URL, shareBase, shareUrl } =
  await import('../src/lib/share')

describe('share links', () => {
  const bill = createBill()
  bill.items = [makeItem('Pizza', 1900)]
  bill.people = [makePerson('Ana', 0)]
  bill.paid = { x: true }

  it('round-trips a bill and drops private paid flags', () => {
    const decoded = decodeShare(`#b=${encodeShare(bill, 'even', { venmo: 'ana' })}`)
    expect(decoded?.bill.items[0].name).toBe('Pizza')
    expect(decoded?.mode).toBe('even')
    expect(decoded?.handles.venmo).toBe('ana')
    expect(decoded?.bill.paid).toEqual({})
  })

  it('keeps a typical dinner small enough for a QR code', async () => {
    const { sampleItems } = await import('../src/sample/sampleBill')
    const dinner = createBill()
    dinner.items = sampleItems()
    dinner.people = ['Alex', 'Sam', 'Priya', 'Jordan'].map(makePerson)
    dinner.items.forEach(
      (i, k) => (i.shares = { [dinner.people[k % 4].id]: 1, [dinner.people[(k + 1) % 4].id]: 2 }),
    )
    dinner.payerId = dinner.people[3].id
    dinner.treatedIds = [dinner.people[1].id]
    const encoded = encodeShare(dinner, 'fair', { venmo: 'jordan' })
    expect(encoded.length).toBeLessThan(600)
    const back = decodeShare(`#b=${encoded}`)!
    const { computeSplit } = await import('../src/lib/split')
    expect(computeSplit(back.bill).people.map((p) => p.total)).toEqual(
      computeSplit(dinner).people.map((p) => p.total),
    )
    expect(back.bill.people[3].id).toBe(back.bill.payerId)
  })

  it('rejects broken or foreign hashes', () => {
    expect(decodeShare('#b=not-real')).toBeNull()
    expect(decodeShare('#other')).toBeNull()
    expect(decodeShare('')).toBeNull()
  })

  it('points localhost links at the public site or the LAN', () => {
    const local = {
      hostname: 'localhost',
      origin: 'http://localhost:5173',
      pathname: '/',
      protocol: 'http:',
      port: '5173',
    }
    expect(shareBase('public', local).url).toBe(PUBLIC_URL)
    expect(shareBase('local', local).url).toBe('http://192.168.1.20:5173/') // stubbed host
    expect(shareBase('local', local, null).url).toBe(PUBLIC_URL)
    expect(shareBase('public', local).choice).toBe(true)
  })

  it('builds the LAN address from the port the app is actually running on', () => {
    const loc = { protocol: 'http:', port: '5174', pathname: '/' }
    expect(lanUrl(loc, '192.168.1.20')).toBe('http://192.168.1.20:5174/')
    expect(lanUrl(loc, null)).toBeNull()
  })

  it('links to the current page on a reachable origin', () => {
    const pages = {
      hostname: 'loupgarou451.github.io',
      origin: 'https://loupgarou451.github.io',
      pathname: '/Tabby/',
      protocol: 'https:',
      port: '',
    }
    expect(shareBase('local', pages)).toEqual({ url: PUBLIC_URL, choice: false })
    expect(shareUrl(PUBLIC_URL, 'abc')).toBe(`${PUBLIC_URL}#b=abc`)
  })
})

describe('paymentLinks', () => {
  it('builds Venmo and Cash App links for USD', () => {
    const links = paymentLinks('USD', { venmo: '@jordan', cashtag: '$jord' }, 4188, 'Friday dinner')
    expect(links).toEqual([
      {
        label: 'Venmo',
        href: 'https://venmo.com/jordan?txn=pay&amount=41.88&note=Friday%20dinner',
      },
      { label: 'Cash App', href: 'https://cash.app/$jord/41.88' },
    ])
  })

  it('only offers apps that support the currency', () => {
    expect(paymentLinks('GBP', { venmo: 'a', cashtag: 'b' }, 100, '').map((l) => l.label)).toEqual([
      'Cash App',
    ])
    expect(paymentLinks('EUR', { venmo: 'a', cashtag: 'b' }, 100, '')).toEqual([])
  })
})
