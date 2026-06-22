import { POST } from './route'

const mockFetch = jest.fn()

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID_BODY = {
  name: 'Γιώργος Παπαδόπουλος',
  email: 'giorgos@test.com',
  subject: 'Γενικές',
  message: 'Θέλω πληροφορίες για το πακέτο.',
}

describe('POST /api/contact', () => {
  beforeEach(() => {
    globalThis.fetch = mockFetch as unknown as typeof fetch
    process.env.BREVO_API_KEY = 'test-brevo-key'
    jest.clearAllMocks()
  })

  afterEach(() => {
    delete process.env.BREVO_API_KEY
  })

  it('returns 503 when BREVO_API_KEY is not set', async () => {
    delete process.env.BREVO_API_KEY
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(503)
  })

  it('returns 400 when body is not valid JSON', async () => {
    const req = new Request('http://localhost/api/contact', { method: 'POST', body: 'not-json' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest({ name: 'Test', email: 'test@test.com' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when name exceeds 200 characters', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, name: 'a'.repeat(201) }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when email exceeds 254 characters', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, email: 'a'.repeat(250) + '@x.com' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when message exceeds 5000 characters', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, message: 'a'.repeat(5001) }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when subject exceeds 100 characters', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, subject: 'a'.repeat(101) }))
    expect(res.status).toBe(400)
  })

  it('returns 200 and { success: true } on success', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  it('returns 502 when Brevo returns an error', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 })
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(502)
  })

  it('sends the email to the correct recipient based on subject', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    await POST(makeRequest({ ...VALID_BODY, subject: 'Τεχνικά' }))
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, { body: string }])[1].body)
    expect(body.to[0].email).toBe('support@protupa.gr')
  })

  it('falls back to info@protupa.gr for unknown subjects', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    await POST(makeRequest({ ...VALID_BODY, subject: 'Άγνωστο Θέμα' }))
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, { body: string }])[1].body)
    expect(body.to[0].email).toBe('info@protupa.gr')
  })

  it('escapes HTML in user input before sending', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    await POST(makeRequest({ ...VALID_BODY, name: '<script>alert(1)</script>' }))
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, { body: string }])[1].body)
    expect(body.htmlContent).not.toContain('<script>')
    expect(body.htmlContent).toContain('&lt;script&gt;')
  })
})
