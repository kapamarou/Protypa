jest.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: jest.fn() }));
jest.mock("@/lib/ratelimit", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  tooManyRequests: () => new Response(JSON.stringify({ error: "rate" }), { status: 429 }),
}));
jest.mock("@/lib/stripe", () => ({ getStripe: jest.fn() }));
jest.mock("@/lib/observability", () => ({ captureException: jest.fn() }));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { getStripe } from "@/lib/stripe";
import { POST } from "./route";

const UUID = "11111111-1111-4111-8111-111111111111";
const DEFAULT_PKG = { id: UUID, stripe_price_id: "price_x", duration_days: 365 };

function serverMock(
  user: unknown,
  pkg: unknown = DEFAULT_PKG,
  pkgErr: unknown = null,
) {
  const maybeSingle = jest.fn().mockResolvedValue({ data: pkg, error: pkgErr });
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
    from: jest.fn().mockReturnValue({ select }),
  };
}

function stripeMock(url = "https://checkout.stripe/x") {
  return { checkout: { sessions: { create: jest.fn().mockResolvedValue({ url }) } } };
}

function req(body: unknown) {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/checkout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
    jest.mocked(getStripe).mockReturnValue(stripeMock() as never);
  });

  it("401 when unauthenticated", async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(serverMock(null) as never);
    expect((await POST(req({ package_id: UUID }))).status).toBe(401);
  });

  it("429 when rate-limited", async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(serverMock({ id: "u" }) as never);
    jest.mocked(checkRateLimit).mockResolvedValue({ allowed: false });
    expect((await POST(req({ package_id: UUID }))).status).toBe(429);
  });

  it("400 when package_id is missing or not a uuid", async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(serverMock({ id: "u" }) as never);
    expect((await POST(req({}))).status).toBe(400);
    expect((await POST(req({ package_id: "not-a-uuid" }))).status).toBe(400);
  });

  it("500 on a package-lookup DB error", async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(
      serverMock({ id: "u" }, null, { message: "db" }) as never,
    );
    expect((await POST(req({ package_id: UUID }))).status).toBe(500);
  });

  it("404 when the package is not found", async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(serverMock({ id: "u" }, null, null) as never);
    expect((await POST(req({ package_id: UUID }))).status).toBe(404);
  });

  it("409 when the package has no stripe_price_id yet", async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(
      serverMock({ id: "u" }, { id: UUID, stripe_price_id: null, duration_days: 365 }) as never,
    );
    expect((await POST(req({ package_id: UUID }))).status).toBe(409);
  });

  it("creates a Stripe session with the package's price on the happy path", async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(
      serverMock({ id: "u", email: "a@b.c" }) as never,
    );
    const stripe = stripeMock("https://pay/abc");
    jest.mocked(getStripe).mockReturnValue(stripe as never);

    const res = await POST(req({ package_id: UUID }));
    expect(res.status).toBe(200);
    expect((await res.json()).url).toBe("https://pay/abc");
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ line_items: [{ price: "price_x", quantity: 1 }] }),
    );
  });
});
