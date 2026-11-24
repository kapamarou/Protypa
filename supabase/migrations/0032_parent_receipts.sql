begin;
create table public.parent_receipts (
 id uuid primary key default gen_random_uuid(),
 parent_id uuid not null references public.profiles(id) on delete restrict,
 storage_path text not null unique,
 file_name text not null,
 receipt_date date not null default current_date,
 amount numeric(12,2) check (amount >= 0),
 description text,
 created_at timestamptz not null default now()
);
create index parent_receipts_parent_date_idx on public.parent_receipts(parent_id, receipt_date desc, created_at desc);
alter table public.parent_receipts enable row level security;
revoke all on public.parent_receipts from anon, authenticated;
grant select on public.parent_receipts to authenticated;
grant all on public.parent_receipts to service_role;
create policy "receipts owner or admin read" on public.parent_receipts for select to authenticated
using (public.current_user_is_admin() or (parent_id = auth.uid() and public.current_user_account_type() = 'parent'));
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('parent-receipts','parent-receipts',false,4194304,array['application/pdf','image/jpeg','image/png']);
-- No client storage policies: only the authorized server routes use service_role.
commit;
