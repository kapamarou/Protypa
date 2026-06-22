-- ============================================================================
-- Protupa — test data setup for the browser E2E suite (docs/BROWSER_TEST_PLAN.md)
-- Run in the Supabase SQL Editor (it runs as the postgres/service role, which
-- bypasses RLS — that's the privileged path for setting is_admin).
--
-- ORDER OF OPERATIONS
--   1. Apply migrations 0027–0031 first (see the verification query at the very
--      bottom — every row must come back ok = true).
--   2. Create the 5 auth users (see "STEP 1" below).
--   3. Run "STEP 2" to set account types / admin / packages.
--   4. (optional) Run "STEP 3" to give SCHOOL_PAID a trade_name for watermark tests.
--
-- Re-running STEP 2/3 is safe (idempotent).
-- ============================================================================


-- ============================================================================
-- STEP 1 — create the users (NOT SQL; do this in the dashboard)
-- ----------------------------------------------------------------------------
-- Supabase Dashboard > Authentication > Users > "Add user", with
-- "Auto Confirm User" CHECKED (so no email verification is needed). Use these
-- emails + any password you'll remember (e.g. Test1234!):
--
--     school.paid@protupa.test
--     school.free@protupa.test
--     parent.paid@protupa.test
--     admin@protupa.test
--     attacker@protupa.test
--
-- (All are created as account_type='school' by the signup trigger; STEP 2 fixes
--  the parent + admin.) The handle_new_user trigger creates each profiles row.
--
-- NOTE: to test the AUTH suite's *email* flows (signup confirmation / password
-- reset, AUTH-1/2/6) you need a REAL inbox — use one extra account with a Gmail
-- you control instead of a @protupa.test address.
-- ============================================================================


-- ============================================================================
-- STEP 2 — account types, admin flag, and active (365-day) packages
-- Edit the emails in the VALUES list if you used different ones.
-- ============================================================================
with cfg(email, account_type, is_admin, package_slug) as (
  values
    ('school.paid@protupa.test'::text, 'school'::text, false, 'school-tier-1'::text),
    ('school.free@protupa.test',       'school',       false, null),
    ('parent.paid@protupa.test',       'parent',       false, 'parent'),
    ('admin@protupa.test',             'school',       true,  null),
    ('attacker@protupa.test',          'school',       false, null)
),
resolved as (
  select c.*, au.id as user_id
  from cfg c
  join auth.users au on au.email = c.email
),
-- data-modifying CTE: always executes
upd as (
  update profiles p
  set account_type = r.account_type,
      is_admin     = r.is_admin
  from resolved r
  where p.id = r.user_id
  returning p.id
)
insert into purchases (user_id, package_id, stripe_session_id, expires_at)
select r.user_id,
       pk.id,
       'test_' || r.user_id || '_' || pk.slug,   -- deterministic => idempotent
       now() + interval '365 days'
from resolved r
join packages pk on pk.slug = r.package_slug
where r.package_slug is not null
on conflict (stripe_session_id) do update
  set expires_at = excluded.expires_at,
      revoked_at = null;

-- Sanity check: who has what?
select au.email, p.account_type, p.is_admin,
       coalesce(string_agg(pk.slug, ', '), '(none)') as active_packages
from auth.users au
join profiles p on p.id = au.id
left join purchases pu on pu.user_id = au.id and pu.expires_at > now()
left join packages pk on pk.id = pu.package_id
where au.email like '%@protupa.test'
group by au.email, p.account_type, p.is_admin
order by au.email;


-- ============================================================================
-- STEP 3 (optional) — give SCHOOL_PAID a trade_name so exam-paper PDFs carry a
-- recognisable watermark (otherwise it falls back to the email).
-- ============================================================================
insert into schools (id, trade_name, legal_name)
select au.id, 'Φροντιστήριο TEST', 'TEST Φροντιστήριο ΟΕ'
from auth.users au
where au.email = 'school.paid@protupa.test'
on conflict (id) do update
  set trade_name = excluded.trade_name,
      legal_name = excluded.legal_name;


-- ============================================================================
-- VERIFICATION — confirm migrations 0027–0031 are applied. Every ok must be true.
-- ============================================================================
select '0027 profiles UPDATE has WITH CHECK' as check,
       exists(select 1 from pg_policies
              where tablename='profiles' and policyname='profiles self update'
                and with_check is not null) as ok
union all
select '0027 current_user_account_type() exists',
       exists(select 1 from pg_proc where proname='current_user_account_type')
union all
select '0028 entitled tags policy present',
       exists(select 1 from pg_policies
              where tablename='simulation_question_tags'
                and policyname='entitled read question tags')
union all
select '0028 old open tags policy removed',
       not exists(select 1 from pg_policies
                  where tablename='simulation_question_tags'
                    and policyname='authenticated read question tags')
union all
select '0029 purchases(package_id) index',
       exists(select 1 from pg_indexes where indexname='purchases_package_id_idx')
union all
select '0029 cleanup_rate_limits() exists',
       exists(select 1 from pg_proc where proname='cleanup_rate_limits')
union all
select '0030 purchases.payment_intent column',
       exists(select 1 from information_schema.columns
              where table_name='purchases' and column_name='payment_intent')
union all
select '0030 purchases.revoked_at column',
       exists(select 1 from information_schema.columns
              where table_name='purchases' and column_name='revoked_at')
union all
select '0031 owner policies have WITH CHECK (expect 5)',
       (select count(*) from pg_policies
        where policyname in ('school owner all','school_simulation owner all',
                             'grade owner all','school manages own students',
                             'school manages own student grades')
          and with_check is not null) = 5
order by check;
