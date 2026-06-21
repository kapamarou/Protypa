-- ──────────────────────────────────────────────────────────────────────────
-- app_settings: generic key-value store for admin-controlled feature flags.
-- First use: controlling visibility of yli (learning schedule) PDFs.
-- ──────────────────────────────────────────────────────────────────────────

create table if not exists app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- Default: both yli PDFs are hidden until the admin explicitly enables them.
insert into app_settings (key, value) values
  ('yli_greek_visible', 'false'),
  ('yli_math_visible',  'false')
on conflict (key) do nothing;

alter table app_settings enable row level security;

-- Anyone (including unauthenticated preview visitors) can read settings.
create policy "app_settings_public_read" on app_settings
  for select using (true);

-- Only admins can insert/update/delete.
create policy "app_settings_admin_write" on app_settings
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  ) with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );
