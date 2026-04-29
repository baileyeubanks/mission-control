-- Migration: Add user_id to creative_briefs for auth association
-- Idempotent: safe to re-run

do $$
begin
  -- Add user_id column if not exists
  if not exists (select 1 from information_schema.columns where table_name='creative_briefs' and column_name='user_id') then
    alter table public.creative_briefs add column user_id text;
  end if;
end
$$;

-- Index for fast user-based lookups
create index if not exists idx_briefs_user on public.creative_briefs(user_id, created_at desc);
