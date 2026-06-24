jest.mock("./supabase/server", () => ({ createSupabaseServiceClient: jest.fn() }));

import { createSupabaseServiceClient } from "./supabase/server";
import { checkRateLimit } from "./ratelimit";

// Mock admin client whose rpc() resolves to the supplied { data, error }.
function adminWithRpc(result: { data?: unknown; error?: unknown }) {
  return { rpc: jest.fn().mockResolvedValue(result) };
}

describe("checkRateLimit — fail-open guarantees", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    jest.restoreAllMocks();
  });

  it("allows (and never builds a client) when the service key is absent", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const r = await checkRateLimit("k", 5, 60);
    expect(r.allowed).toBe(true);
    expect(createSupabaseServiceClient).not.toHaveBeenCalled();
  });

  it("allows when the count is within the limit", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "x";
    jest.mocked(createSupabaseServiceClient).mockReturnValue(adminWithRpc({ data: 3, error: null }) as never);
    expect((await checkRateLimit("k", 5, 60)).allowed).toBe(true);
  });

  it("blocks when the count exceeds the limit", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "x";
    jest.mocked(createSupabaseServiceClient).mockReturnValue(adminWithRpc({ data: 6, error: null }) as never);
    expect((await checkRateLimit("k", 5, 60)).allowed).toBe(false);
  });

  it("fails OPEN when the rpc returns an error", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "x";
    jest.mocked(createSupabaseServiceClient).mockReturnValue(
      adminWithRpc({ data: null, error: { message: "db down" } }) as never,
    );
    expect((await checkRateLimit("k", 5, 60)).allowed).toBe(true);
  });

  it("fails OPEN when the client throws", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "x";
    jest.mocked(createSupabaseServiceClient).mockImplementation(() => {
      throw new Error("nope");
    });
    expect((await checkRateLimit("k", 5, 60)).allowed).toBe(true);
  });
});
