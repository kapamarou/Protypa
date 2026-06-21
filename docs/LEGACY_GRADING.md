# Legacy grading path — decision record (WP-D3)

_Last reviewed: 2026-06 pre-launch hardening._

## Two grading systems coexist

| | **Live path (keep)** | **Legacy path (orphaned)** |
|---|---|---|
| Tables | `simulations`, `school_simulations`, `student_simulation_grades`, `simulation_question_tags` | `exam_papers`, `questions`, `grading_sessions`, `simulation_grades` |
| UI | `/account/grading`, `/account/grading/[id]`, `/account/students/[id]` | `/grade/[id]`, `/account/history`, `/account/papers` |
| API | `/api/grade` writes… see note | `/api/grade` (POST), ~~`/api/papers/[id]/pdf`~~ (deleted) |
| Storage | `exam-papers` (private, watermarked) | `exam-pdfs` (bucket may not even exist) |
| Model | named per-student grades, school-scoped RLS | anonymous/self grading sessions |

> Note: `/api/grade` (POST) and `scoreAnswers`/`computeScore` are shared plumbing; the
> POST route currently writes to the **legacy** `grading_sessions` table.

## Reachability finding

The legacy **pages are orphaned**: `grep` finds no `href`/router link to `/grade/[id]`,
`/account/history`, or `/account/papers` anywhere in `src/` except the legacy page linking
to itself. They are not in any nav. A user cannot reach them through the app; only a
hand-typed URL would.

## Security assessment (launch-safe)

- **Answer-key leak (was the real risk): FIXED.** `/grade/[id]` no longer ships
  `correct_answer` to the browser (WP-C1). `simulation_question_tags` reads are now
  entitlement-scoped (WP-C2).
- `/grade/[id]` and `/api/grade` both require auth **and** `hasAccessToPaper` entitlement.
- `grading_sessions` RLS is owner-only (`auth.uid() = user_id`) — no cross-user read.
- The dead, broken `/api/papers/[id]/pdf` route (wrong `exam-pdfs` bucket, referenced only
  by a stale comment) was **deleted** in WP-D2.

Conclusion: the legacy path is **not a security liability** for launch.

## Recommendation (owner decision)

**Remove the legacy path after launch.** It is superseded by the live school-grading
flow and only adds RLS/attack surface and confusion. Suggested order, when the owner
confirms no legacy `grading_sessions` data must be retained:

1. Delete pages `/grade/[id]`, `/account/history`, `/account/papers` and the `GradingClient`.
2. Point `/api/grade` at the live schema, or delete it if unused by then.
3. Forward-only migration to `drop table grading_sessions, simulation_grades, questions, exam_papers cascade;`
   (destructive — take a backup first).

Deferred intentionally: dropping tables is irreversible and may discard data, so it is left
to an explicit owner go-ahead rather than bundled into this hardening pass.
