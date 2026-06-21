jest.mock('@/lib/supabase/server', () => ({
  createSupabaseServiceClient: jest.fn(),
}))

import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { GET } from './route'

function makeParams(subject: string) {
  return { params: Promise.resolve({ subject }) }
}

// Builds an admin client mock with a controllable app_settings value and
// an optional signed URL from storage.
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
      : { data: null, error: new Error('Object not found') }
  )
  const storageFrom = jest.fn().mockReturnValue({ createSignedUrl })

  return {
    from:    jest.fn().mockReturnValue({ select: settingSelect }),
    storage: { from: storageFrom },
  }
}

describe('GET /api/yli/[subject]', () => {
  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    jest.clearAllMocks()
  })

  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  it('returns 404 for an unknown subject', async () => {
    const res = await GET(new Request('http://localhost'), makeParams('biology'))
    expect(res.status).toBe(404)
  })

  it('returns 503 when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const res = await GET(new Request('http://localhost'), makeParams('greek'))
    expect(res.status).toBe(503)
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

  it('returns 404 when the file has not been uploaded yet', async () => {
    jest.mocked(createSupabaseServiceClient).mockReturnValue(makeAdminMock('true', null) as never)
    const res = await GET(new Request('http://localhost'), makeParams('greek'))
    expect(res.status).toBe(404)
  })

  it('redirects to the signed URL when the file is available', async () => {
    const url = 'https://storage.example.com/yli/greek.pdf?token=abc'
    jest.mocked(createSupabaseServiceClient).mockReturnValue(makeAdminMock('true', url) as never)
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
