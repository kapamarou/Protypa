jest.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: jest.fn(),
}))

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { GET } from './route'

const MOCK_USER = { id: 'user-abc', email: 'user@test.com', created_at: '2024-01-01T00:00:00Z' }

// Returns a mock Supabase client where every .from() chain resolves with
// the supplied data. Supports both .maybeSingle() and direct await patterns.
function makeClient(user: unknown, tableData: Record<string, unknown> = {}) {
  function chain(data: unknown): unknown {
    const obj: Record<string, unknown> = {}
    obj['select']      = jest.fn().mockReturnValue(obj)
    obj['eq']          = jest.fn().mockReturnValue(obj)
    obj['maybeSingle'] = jest.fn().mockResolvedValue({ data, error: null })
    // Makes the chain itself thenable (for direct await of .eq() etc.)
    obj['then'] = (resolve: (v: { data: unknown; error: null }) => unknown) =>
      Promise.resolve({ data, error: null }).then(resolve)
    return obj
  }

  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
    from: jest.fn().mockImplementation((table: string) => chain(tableData[table] ?? null)),
  }
}

describe('GET /api/account/export', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when the user is not authenticated', async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(makeClient(null) as never)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 200 with application/json content-type', async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(makeClient(MOCK_USER) as never)
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
  })

  it('sets Content-Disposition to trigger a file download', async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(makeClient(MOCK_USER) as never)
    const res = await GET()
    expect(res.headers.get('content-disposition')).toContain('protypa-data-export.json')
  })

  it('includes the account object with id and email', async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(makeClient(MOCK_USER) as never)
    const data = await (await GET()).json()
    expect(data.account.id).toBe(MOCK_USER.id)
    expect(data.account.email).toBe(MOCK_USER.email)
  })

  it('includes exported_at timestamp', async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(makeClient(MOCK_USER) as never)
    const data = await (await GET()).json()
    expect(data.exported_at).toBeTruthy()
    expect(new Date(data.exported_at).getFullYear()).toBeGreaterThanOrEqual(2024)
  })

  it('includes profile, school, purchases, and students keys', async () => {
    const mockProfile = { id: MOCK_USER.id, account_type: 'school', full_name: 'Test School' }
    jest.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient(MOCK_USER, { profiles: mockProfile }) as never
    )
    const data = await (await GET()).json()
    expect(data).toHaveProperty('profile')
    expect(data).toHaveProperty('school')
    expect(data).toHaveProperty('purchases')
    expect(data).toHaveProperty('students')
  })

  // Regression guard for WP-D1: students are owned via school_id. Querying the
  // non-existent user_id column silently returned no students for every user.
  it('queries students by school_id, not user_id', async () => {
    const client = makeClient(MOCK_USER)
    jest.mocked(createSupabaseServerClient).mockResolvedValue(client as never)
    await GET()

    const studentsCallIndex = client.from.mock.calls.findIndex(
      ([table]: [string]) => table === 'students',
    )
    expect(studentsCallIndex).toBeGreaterThanOrEqual(0)
    const studentsChain = client.from.mock.results[studentsCallIndex].value as {
      eq: jest.Mock
    }
    expect(studentsChain.eq).toHaveBeenCalledWith('school_id', MOCK_USER.id)
    expect(studentsChain.eq).not.toHaveBeenCalledWith('user_id', MOCK_USER.id)
  })
})
