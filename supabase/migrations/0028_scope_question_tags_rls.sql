-- 0028 — Scope simulation_question_tags reads to entitled users (WP-C2)
--
-- PROBLEM: 0003 created
--   create policy "authenticated read question tags"
--     on simulation_question_tags for select
--     using (auth.role() = 'authenticated');
-- and 0018 later added the `correct_answer` column to this table. So ANY
-- logged-in account — paid or not, for ANY simulation — can read every answer
-- key via the anon key (e.g. a free signup scraping all correct answers).
--
-- RLS is row-level, not column-level, so we cannot hide just `correct_answer`.
-- The fix scopes WHICH rows a user may read: only tags for a subject they hold
-- an active entitlement for (or admins). An entitled tutoring centre legitimately
-- sees the answers for the subjects it paid for — it is the grader. Unpaid
-- accounts now read zero rows.
--
-- Entitlement model (mirrors the app's grading page):
--   • parent / school packages bundle both subjects
--   • a legacy 'bundle' package covers both
--   • otherwise the package's own subject must match the tag's subject
--
-- The subquery touches only purchases (self-read RLS) and packages (public read),
-- never simulation_question_tags itself, so there is no policy recursion.

drop policy if exists "authenticated read question tags" on simulation_question_tags;

create policy "entitled read question tags"
  on simulation_question_tags for select
  using (
    public.current_user_is_admin()
    or exists (
      select 1
      from purchases p
      join packages pk on pk.id = p.package_id
      where p.user_id = auth.uid()
        and p.expires_at > now()
        and (
          pk.package_type in ('parent', 'school')
          or pk.subject = 'bundle'
          or pk.subject::text = simulation_question_tags.subject
        )
    )
  );
