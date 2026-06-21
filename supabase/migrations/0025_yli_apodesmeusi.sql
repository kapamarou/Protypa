-- ──────────────────────────────────────────────────────────────────────────
-- Add app_setting for the exam-paper release recommendation PDF.
-- Hidden by default until the admin uploads and enables it.
-- ──────────────────────────────────────────────────────────────────────────

insert into app_settings (key, value)
values ('yli_apodesmeusi_visible', 'false')
on conflict (key) do nothing;
