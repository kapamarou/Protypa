jest.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: jest.fn(),
  createSupabaseServiceClient: jest.fn(),
}))
jest.mock('@/lib/entitlements', () => ({
  getActivePackages: jest.fn(),
}))
jest.mock('@/lib/ratelimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  tooManyRequests: () =>
    new Response(JSON.stringify({ error: 'rate' }), { status: 429 }),
}))

import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase/server'
import { getActivePackages } from '@/lib/entitlements'
import { checkRateLimit } from '@/lib/ratelimit'
import { GET } from './route'

function makeParams(subject: string) {
  return { params: Promise.resolve({ subject }) }
}

// Server client: controls the authenticated user + their profile.is_admin.
function makeServerMock(
  user: { id: string } | null,
  isAdmin: boolean | null = false,
) {
  const maybeSingle = jest.fn().mockResolvedValue({
    data: isAdmin === null ? null : { is_admin: isAdmin },
    error: null,
  })
  const eq = jest.fn().mockReturnValue({ maybeSingle })
  const select = jest.fn().mockReturnValue({ eq })
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
    from: jest.fn().mockReturnValue({ select }),
  }
}

// Service client: controllable app_settings value + optional storage signed URL.
function makeAdminMock(settingValue: string | null, signedUrl: string | null = null) {
  const maybeSingle = jest.fn().mockResolvedValue({
    data: settingValue !== null ? { value: settingValue } : null,
    error: null,
  })
  const settingEq     = jest.fn().mockReturnValue({ maybeSingle })
  const settingSelect = jest.fn().mockReturnValue({ eq: settingEq })

  const createSignedUrl = jest.fn().mockResolvedValue(
    signedUrl
      ? { data: { signedUrl }, error: null }
      : { data: null, error: new Error('Object not found') },
  )
  const storageFrom = jest.fn().mockReturnValue({ createSignedUrl })

  return {
    from:    jest.fn().mockReturnValue({ select: settingSelect }),
    storage: { from: storageFrom },
  }
}

// An active package that bundles both subjects (covers greek/math/any).
const BUNDLE = [{ pkg: { package_type: 'school', subject: null } }]

describe('GET /api/yli/[subject]', () => {
  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    jest.clearAllMocks()
    // Default: authenticated, non-admin, entitled, not rate-limited.
    jest.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerMock({ id: 'user-1' }, false) as never,
    )
    jest.mocked(getActivePackages).mockResolvedValue(BUNDLE as never)
    jest.mocked(checkRateLimit).mockResolvedValue({ allowed: true })
  })

  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  it('returns 404 for an unknown subject', async () => {
    const res = await GET(new Request('http://localhost'), makeParams('biology'))
    expect(res.status).toBe(404)
  })

  it('returns 401 for an anonymous (unauthenticated) request', async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerMock(null) as never,
    )
    const res = await GET(new Request('http://localhost'), makeParams('greek'))
    expect(res.status).toBe(401)
  })

  it('returns 429 when the user is rate-limited', async () => {
    jest.mocked(checkRateLimit).mockResolvedValue({ allowed: false })
    const res = await GET(new Request('http://localhost'), makeParams('greek'))
    expect(res.status).toBe(429)
  })

  it('returns 403 for an authenticated user with NO active package', async () => {
    jest.mocked(getActivePackages).mockResolvedValue([] as never)
    const res = await GET(new Request('http://localhost'), makeParams('greek'))
    expect(res.status).toBe(403)
  })

  it('returns 403 when the visibility setting is "false"', async () => {
    jest.mocked(createSupabaseServiceClient).mockReturnValue(makeAdminMock('false') as never)
    const res = await GET(new Request('http://localhost'), makeParams('greek'))
    expect(res.status).toBe(403)
  })

  it('returns 403 when the visibility setting is missing (null)', async () => {
    jest.mocked(createSupabaseServiceClient).mockReturnValue(makeAdminMock(null) as never)
    const res = await GET(new Request('http://localhost'), makeParams('math'))
    expect(res.status).toBe(403)
  })

  it('returns 503 when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const res = await GET(new Request('http://localhost'), makeParams('greek'))
    expect(res.status).toBe(503)
  })

  it('returns 404 when the file has not been uploaded yet', async () => {
    jest.mocked(createSupabaseServiceClient).mockReturnValue(makeAdminMock('true', null) as never)
    const res = await GET(new Request('http://localhost'), makeParams('greek'))
    expect(res.status).toBe(404)
  })

  it('redirects an entitled user to the signed URL when available', async () => {
    const url = 'https://storage.example.com/yli/greek.pdf?token=abc'
    jest.mocked(createSupabaseServiceClient).mockReturnValue(makeAdminMock('true', url) as never)
    const res = await GET(new Request('http://localhost'), makeParams('greek'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(url)
  })

  it('lets an admin bypass entitlement AND the visibility toggle', async () => {
    const url = 'https://storage.example.com/yli/greek.pdf?token=admin'
    jest.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerMock({ id: 'admin-1' }, true) as never,
    )
    jest.mocked(getActivePackages).mockResolvedValue([] as never) // no package
    // visibility "false" — admin should still get through
    jest.mocked(createSupabaseServiceClient).mockReturnValue(makeAdminMock('false', url) as never)
    const res = await GET(new Request('http://localhost'), makeParams('greek'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(url)
  })

  it('works correctly for the math subject', async () => {
    const url = 'https://storage.example.com/yli/math.pdf?token=xyz'
    jest.mocked(createSupabaseServiceClient).mockReturnValue(makeAdminMock('true', url) as never)
    const res = await GET(new Request('http://localhost'), makeParams('math'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(url)
  })

  it('checks the correct setting key for each subject', async () => {
    const admin = makeAdminMock('true', 'https://example.com/file.pdf')
    jest.mocked(createSupabaseServiceClient).mockReturnValue(admin as never)
    await GET(new Request('http://localhost'), makeParams('greek'))
    expect(admin.from().select().eq).toHaveBeenCalledWith('key', 'yli_greek_visible')
  })
})
