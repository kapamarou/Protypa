-- Rate-limiting table used by the API to protect expensive / spammable endpoints.
-- Rows are keyed by "{endpoint}:{user_id_or_ip}" and hold a sliding-window count.
-- No public RLS policies → only reachable via the service-role key.

create table if not exists rate_limits (
  key          text        primary key,
  count        integer     not null default 0,
  window_start timestamptz not null default now()
);

alter table rate_limits enable row level security;

-- Atomically increment and return the new count.
-- Resets the window if the previous window has expired.
create or replace function increment_rate_limit(
  p_key            text,
  p_max            integer,
  p_window_seconds integer
) returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  insert into rate_limits (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update set
    count = case
      when rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval
        then 1          -- window expired: reset to 1
      else rate_limits.count + 1
    end,
    window_start = case
      when rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval
        then now()      -- start a new window
      else rate_limits.window_start
    end
  returning count into v_count;

  return v_count;
end;
$$;
