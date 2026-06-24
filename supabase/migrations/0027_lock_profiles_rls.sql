-- 0027 — Lock the profiles UPDATE policy against privilege escalation (WP-A1)
--
-- PROBLEM: profiles has TWO permissive UPDATE policies, both authorising only
-- by row ownership with NO `with check`:
--   • "profiles self update"   (0001_init.sql)
--   • "user update own profile" (0002_schools_grading.sql)
-- Permissive policies are OR'd, so a logged-in user could, via the anon key,
--   update profiles set is_admin = true where id = auth.uid();
-- and unlock every admin-gated table, the private papers bucket, and all
-- student data. This single hole invalidates every other admin control.
--
-- FIX: drop BOTH update policies and recreate a single one whose `with check`
-- pins the privilege/identity columns (is_admin, account_type) to the caller's
-- CURRENT values. A non-admin therefore cannot set is_admin = true, and nobody
-- can flip their own account_type, while ordinary edits (full_name, school_name,
-- onboarding_complete) still succeed.
--
-- Legitimate role changes must go through a service-role server route
-- (/api/admin/*), which bypasses RLS — never the anon client.
--
-- The comparisons use SECURITY DEFINER helpers (not inline subqueries on
-- profiles) to avoid the "infinite recursion detected in policy for relation
-- profiles" problem that 0005 already had to fix.

-- Caller's current account_type, RLS-bypassing (mirrors current_user_is_admin).
create or replace function public.current_user_account_type()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select account_type from profiles where id = auth.uid()), 'school')
$$;

grant execute on function public.current_user_account_type() to anon, authenticated;

-- Drop every existing UPDATE policy on profiles (permissive ⇒ OR'd ⇒ all must be locked).
drop policy if exists "profiles self update"   on profiles;
drop policy if exists "user update own profile" on profiles;

create policy "profiles self update" on profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and is_admin      = public.current_user_is_admin()
    and account_type  = public.current_user_account_type()
  );
