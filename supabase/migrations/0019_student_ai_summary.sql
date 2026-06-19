alter table students
  add column if not exists ai_summary           text,
  add column if not exists ai_summary_generated_at timestamptz;
