jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(),
  createSupabaseServiceClient: jest.fn(),
}));
jest.mock("@/lib/entitlements", () => ({ hasAccessToPaper: jest.fn() }));
jest.mock("@/lib/ratelimit", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  tooManyRequests: () => new Response(JSON.stringify({ error: "rate" }), { status: 429 }),
}));
jest.mock("@/lib/observability", () => ({ captureException: jest.fn() }));

import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { hasAccessToPaper } from "@/lib/entitlements";
import { checkRateLimit } from "@/lib/ratelimit";
import { POST } from "./route";

const UUID = "22222222-2222-4222-8222-222222222222";
const QUESTIONS = [
  { id: "q1", paper_id: UUID, number: 1, qtype: "grammar", prompt_el: null, choices: ["A", "B"], correct_answer: "A" },
  { id: "q2", paper_id: UUID, number: 2, qtype: "grammar", prompt_el: null, choices: ["A", "B"], correct_answer: "B" },
];
const GOOD = { paper_id: UUID, student_name: "Test", answers: { "1": "A", "2": "B" } };

function serverMock(user: unknown, questions: unknown = QUESTIONS, qErr: unknown = null) {
  const order = jest.fn().mockResolvedValue({ data: questions, error: qErr });
  const eq = jest.fn().mockReturnValue({ order });
  const select = jest.fn().mockReturnValue({ eq });
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
    from: jest.fn().mockReturnValue({ select }),
  };
}

function serviceMock(insErr: unknown = null) {
  const insert = jest.fn().mockResolvedValue({ error: insErr });
  return { from: jest.fn().mockReturnValue({ insert }), _insert: insert };
}

function req(body: unknown) {
  return new Request("http://localhost/api/grade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/grade", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
    jest.mocked(hasAccessToPaper).mockResolvedValue(true);
    jest.mocked(createSupabaseServiceClient).mockReturnValue(serviceMock() as never);
  });

  it("401 when unauthenticated", async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(serverMock(null) as never);
    expect((await POST(req(GOOD))).status).toBe(401);
  });

  it("429 when rate-limited", async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(serverMock({ id: "u" }) as never);
    jest.mocked(checkRateLimit).mockResolvedValue({ allowed: false });
    expect((await POST(req(GOOD))).status).toBe(429);
  });

  it("400 on a non-uuid paper_id", async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(serverMock({ id: "u" }) as never);
    expect((await POST(req({ ...GOOD, paper_id: "x" }))).status).toBe(400);
  });

  it("400 on a non-string answer value", async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(serverMock({ id: "u" }) as never);
    expect((await POST(req({ ...GOOD, answers: { "1": 5 } }))).status).toBe(400);
  });

  it("403 without paper access (entitlement)", async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(serverMock({ id: "u" }) as never);
    jest.mocked(hasAccessToPaper).mockResolvedValue(false);
    expect((await POST(req(GOOD))).status).toBe(403);
  });

  it("500 on a questions DB error (not a misleading 404)", async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(
      serverMock({ id: "u" }, null, { message: "db" }) as never,
    );
    expect((await POST(req(GOOD))).status).toBe(500);
  });

  it("404 when the paper has no questions", async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(serverMock({ id: "u" }, [], null) as never);
    expect((await POST(req(GOOD))).status).toBe(404);
  });

  it("scores server-side and persists on the happy path", async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(serverMock({ id: "u" }) as never);
    const svc = serviceMock();
    jest.mocked(createSupabaseServiceClient).mockReturnValue(svc as never);

    const res = await POST(req(GOOD));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.score).toBe(2);
    expect(json.total).toBe(2);
    expect(svc._insert).toHaveBeenCalled();
  });

  it("500 when persisting the grade fails", async () => {
    jest.mocked(createSupabaseServerClient).mockResolvedValue(serverMock({ id: "u" }) as never);
    jest.mocked(createSupabaseServiceClient).mockReturnValue(serviceMock({ message: "insert fail" }) as never);
    expect((await POST(req(GOOD))).status).toBe(500);
  });
});
