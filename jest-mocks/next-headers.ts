// Minimal stub for next/headers used in server-side Supabase client setup.
// The actual client is always mocked in tests, so these implementations are never reached.
export const cookies = () => ({ getAll: () => [], set: () => {} })
