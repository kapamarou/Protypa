jest.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: jest.fn(),
  createSupabaseServiceClient: jest.fn(),
}))

import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { DELETE } from './route'

const MOCK_USER = { id: 'user-abc', email: 'test@test.com' }

function makeServerMock(user: unknown = null) {
  return { auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) } }
}

describe('DELETE /api/account/delete', () => {
  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    jest.clearAllMocks()
  })

  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  it('returns 503 when supabase client is not configured', async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(null as never)
    const res = await DELETE()
    expect(res.status).toBe(503)
  })

  it('returns 401 when the user is not authenticated', async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(makeServerMock(null) as never)
    const res = await DELETE()
    expect(res.status).toBe(401)
  })

  it('returns 503 when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    jest.mocked(createSupabaseServerClient).mockResolvedValue(makeServerMock(MOCK_USER) as never)
    const res = await DELETE()
    expect(res.status).toBe(503)
  })

  it('returns 500 when deleteUser fails', async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(makeServerMock(MOCK_USER) as never)
    jest.mocked(createSupabaseServiceClient).mockReturnValue({
      auth: { admin: { deleteUser: jest.fn().mockResolvedValue({ error: new Error('DB error') }) } },
    } as never)
    const res = await DELETE()
    expect(res.status).toBe(500)
  })

  it('returns 200 with { success: true } on successful deletion', async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(makeServerMock(MOCK_USER) as never)
    jest.mocked(createSupabaseServiceClient).mockReturnValue({
      auth: { admin: { deleteUser: jest.fn().mockResolvedValue({ error: null }) } },
    } as never)
    const res = await DELETE()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  it('calls deleteUser with the authenticated user id', async () => {
    const deleteUser = jest.fn().mockResolvedValue({ error: null })
    jest.mocked(createSupabaseServerClient).mockResolvedValue(makeServerMock(MOCK_USER) as never)
    jest.mocked(createSupabaseServiceClient).mockReturnValue({
      auth: { admin: { deleteUser } },
    } as never)
    await DELETE()
    expect(deleteUser).toHaveBeenCalledWith(MOCK_USER.id)
  })
})
