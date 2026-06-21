jest.mock('./supabase/server', () => ({
  createSupabaseServerClient: jest.fn(),
}))

import { createSupabaseServerClient } from './supabase/server'
import { getStudentLimit } from './entitlements'

// Builds a minimal Supabase mock that returns `purchases` from the query chain:
// .from().select().eq().gt().order()
function makeSupabaseMock(purchases: unknown[]) {
  const order  = jest.fn().mockResolvedValue({ data: purchases, error: null })
  const gt     = jest.fn().mockReturnValue({ order })
  const eq     = jest.fn().mockReturnValue({ gt })
  const select = jest.fn().mockReturnValue({ eq })
  return { from: jest.fn().mockReturnValue({ select }) }
}

describe('getStudentLimit', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 0 when there are no active packages', async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(makeSupabaseMock([]) as never)
    expect(await getStudentLimit('user-1')).toBe(0)
  })

  it('returns 0 when supabase is not configured', async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(null as never)
    expect(await getStudentLimit('user-1')).toBe(0)
  })

  it('returns the base package max_students for a school tier', async () => {
    const purchases = [{ packages: { package_type: 'school', max_students: 10 } }]
    jest.mocked(createSupabaseServerClient).mockResolvedValue(makeSupabaseMock(purchases) as never)
    expect(await getStudentLimit('user-1')).toBe(10)
  })

  it('returns 1 for the parent package', async () => {
    const purchases = [{ packages: { package_type: 'parent', max_students: 1 } }]
    jest.mocked(createSupabaseServerClient).mockResolvedValue(makeSupabaseMock(purchases) as never)
    expect(await getStudentLimit('user-1')).toBe(1)
  })

  it('adds a single expansion pack on top of the base limit', async () => {
    const purchases = [
      { packages: { package_type: 'school',    max_students: 10 } },
      { packages: { package_type: 'expansion', max_students: 5  } },
    ]
    jest.mocked(createSupabaseServerClient).mockResolvedValue(makeSupabaseMock(purchases) as never)
    expect(await getStudentLimit('user-1')).toBe(15)
  })

  it('sums multiple expansion packs', async () => {
    const purchases = [
      { packages: { package_type: 'school',    max_students: 10 } },
      { packages: { package_type: 'expansion', max_students: 5  } },
      { packages: { package_type: 'expansion', max_students: 5  } },
    ]
    jest.mocked(createSupabaseServerClient).mockResolvedValue(makeSupabaseMock(purchases) as never)
    expect(await getStudentLimit('user-1')).toBe(20)
  })

  it('uses the highest base tier when multiple base packages are active', async () => {
    const purchases = [
      { packages: { package_type: 'school', max_students: 20 } },
      { packages: { package_type: 'school', max_students: 10 } },
    ]
    jest.mocked(createSupabaseServerClient).mockResolvedValue(makeSupabaseMock(purchases) as never)
    expect(await getStudentLimit('user-1')).toBe(20)
  })

  it('handles expansion-only purchases (no base) — sums expansions only', async () => {
    const purchases = [{ packages: { package_type: 'expansion', max_students: 5 } }]
    jest.mocked(createSupabaseServerClient).mockResolvedValue(makeSupabaseMock(purchases) as never)
    expect(await getStudentLimit('user-1')).toBe(5)
  })

  it('handles null max_students gracefully', async () => {
    const purchases = [{ packages: { package_type: 'school', max_students: null } }]
    jest.mocked(createSupabaseServerClient).mockResolvedValue(makeSupabaseMock(purchases) as never)
    expect(await getStudentLimit('user-1')).toBe(0)
  })
})
