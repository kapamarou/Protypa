jest.mock('@/lib/stripe', () => ({ getStripe: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({ createSupabaseServiceClient: jest.fn() }))

import { getStripe } from '@/lib/stripe'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { POST } from './route'

const SESSION_CREATED = 1_700_000_000 // fixed Unix seconds
const YEAR_MS = 365 * 86_400_000

function completed(paymentStatus: string, type = 'checkout.session.completed') {
  return {
    type,
    data: {
      object: {
        id: 'cs_1',
        created: SESSION_CREATED,
        payment_status: paymentStatus,
        payment_intent: 'pi_1',
        metadata: { user_id: 'u1', package_id: 'pkg1' },
      },
    },
  }
}

function makeStripe(event: unknown, opts: { throwSig?: boolean; lineItemPrice?: string } = {}) {
  return {
    webhooks: {
      constructEvent: jest.fn(() => {
        if (opts.throwSig) throw new Error('bad signature')
        return event
      }),
    },
    checkout: {
      sessions: {
        listLineItems: jest.fn().mockResolvedValue({
          data: [{ price: { id: opts.lineItemPrice ?? 'price_pkg' } }],
        }),
      },
    },
  }
}

const DEFAULT_PKG = { id: 'pkg1', duration_days: 365, stripe_price_id: 'price_pkg', price_cents: 6000 }

function makeAdmin(opts: {
  pkg?: unknown
  pkgErr?: unknown
  upsertErr?: unknown
  updateErr?: unknown
} = {}) {
  const upsert = jest.fn().mockResolvedValue({ error: opts.upsertErr ?? null })

  const maybeSingle = jest.fn().mockResolvedValue({
    data: 'pkg' in opts ? opts.pkg : DEFAULT_PKG,
    error: opts.pkgErr ?? null,
  })
  const pkgSelect = jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle }) })

  const is = jest.fn().mockResolvedValue({ error: opts.updateErr ?? null })
  const update = jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ is }) })

  const from = jest.fn().mockImplementation((t: string) => {
    if (t === 'packages') return { select: pkgSelect }
    if (t === 'purchases') return { upsert, update }
    return {}
  })
  return { from, _upsert: upsert, _update: update }
}

function req() {
  return new Request('http://localhost/api/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 'sig' },
    body: 'raw',
  })
}

describe('POST /api/webhook', () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    jest.restoreAllMocks()
  })

  it('rejects an invalid signature with 401', async () => {
    jest.mocked(getStripe).mockReturnValue(makeStripe(null, { throwSig: true }) as never)
    jest.mocked(createSupabaseServiceClient).mockReturnValue(makeAdmin() as never)
    const res = await POST(req())
    expect(res.status).toBe(401)
  })

  it('B2: does NOT provision when payment_status != "paid"', async () => {
    jest.mocked(getStripe).mockReturnValue(makeStripe(completed('unpaid')) as never)
    const admin = makeAdmin()
    jest.mocked(createSupabaseServiceClient).mockReturnValue(admin as never)
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(admin._upsert).not.toHaveBeenCalled()
  })

  it('provisions on completed + paid, anchoring expiry to session.created (B4: no drift)', async () => {
    jest.mocked(getStripe).mockReturnValue(makeStripe(completed('paid')) as never)
    const admin = makeAdmin()
    jest.mocked(createSupabaseServiceClient).mockReturnValue(admin as never)
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(admin._upsert).toHaveBeenCalledTimes(1)
    const [row, options] = admin._upsert.mock.calls[0]
    expect(row.expires_at).toBe(new Date(SESSION_CREATED * 1000 + YEAR_MS).toISOString())
    expect(row.payment_intent).toBe('pi_1')
    // B4: insert-or-ignore so a re-delivery never overwrites/shifts the window.
    expect(options).toEqual({ onConflict: 'stripe_session_id', ignoreDuplicates: true })
  })

  it('B2: provisions on async_payment_succeeded + paid', async () => {
    jest.mocked(getStripe).mockReturnValue(
      makeStripe(completed('paid', 'checkout.session.async_payment_succeeded')) as never,
    )
    const admin = makeAdmin()
    jest.mocked(createSupabaseServiceClient).mockReturnValue(admin as never)
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(admin._upsert).toHaveBeenCalledTimes(1)
  })

  it('B5: rejects (no provision) when the charged price != package price', async () => {
    jest.mocked(getStripe).mockReturnValue(
      makeStripe(completed('paid'), { lineItemPrice: 'price_other' }) as never,
    )
    const admin = makeAdmin()
    jest.mocked(createSupabaseServiceClient).mockReturnValue(admin as never)
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(admin._upsert).not.toHaveBeenCalled()
  })

  it('rejects (no provision) when the package is not found', async () => {
    jest.mocked(getStripe).mockReturnValue(makeStripe(completed('paid')) as never)
    const admin = makeAdmin({ pkg: null })
    jest.mocked(createSupabaseServiceClient).mockReturnValue(admin as never)
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(admin._upsert).not.toHaveBeenCalled()
  })

  it('B4: malformed duration does not throw or mis-grant (returns 200, no provision)', async () => {
    jest.mocked(getStripe).mockReturnValue(makeStripe(completed('paid')) as never)
    const admin = makeAdmin({ pkg: { ...DEFAULT_PKG, duration_days: 'abc' } })
    jest.mocked(createSupabaseServiceClient).mockReturnValue(admin as never)
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(admin._upsert).not.toHaveBeenCalled()
  })

  it('B1: returns 500 (retry) when the purchase write fails', async () => {
    jest.mocked(getStripe).mockReturnValue(makeStripe(completed('paid')) as never)
    const admin = makeAdmin({ upsertErr: { message: 'db down' } })
    jest.mocked(createSupabaseServiceClient).mockReturnValue(admin as never)
    const res = await POST(req())
    expect(res.status).toBe(500)
  })

  it('B3: full refund revokes the matching purchase', async () => {
    const event = { type: 'charge.refunded', data: { object: { payment_intent: 'pi_1', refunded: true } } }
    jest.mocked(getStripe).mockReturnValue(makeStripe(event) as never)
    const admin = makeAdmin()
    jest.mocked(createSupabaseServiceClient).mockReturnValue(admin as never)
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(admin._update).toHaveBeenCalledTimes(1)
  })

  it('B3: a PARTIAL refund does NOT revoke', async () => {
    const event = { type: 'charge.refunded', data: { object: { payment_intent: 'pi_1', refunded: false } } }
    jest.mocked(getStripe).mockReturnValue(makeStripe(event) as never)
    const admin = makeAdmin()
    jest.mocked(createSupabaseServiceClient).mockReturnValue(admin as never)
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(admin._update).not.toHaveBeenCalled()
  })

  it('B3: a dispute revokes the matching purchase', async () => {
    const event = { type: 'charge.dispute.created', data: { object: { payment_intent: 'pi_1' } } }
    jest.mocked(getStripe).mockReturnValue(makeStripe(event) as never)
    const admin = makeAdmin()
    jest.mocked(createSupabaseServiceClient).mockReturnValue(admin as never)
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(admin._update).toHaveBeenCalledTimes(1)
  })
})
