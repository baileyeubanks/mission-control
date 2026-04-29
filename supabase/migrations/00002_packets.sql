create extension if not exists pgcrypto;

do $$
begin
  if to_regtype('public.packet_status') is null then
    create type public.packet_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');
  end if;
end
$$;

do $$
begin
  if to_regtype('public.packet_kind') is null then
    create type public.packet_kind as enum (
      'intake_extract',
      'draft_job_update',
      'schedule_optimize',
      'thread_summarize',
      'thread_reply_draft'
    );
  end if;
end
$$;

create table if not exists public.packets (
  id uuid primary key default gen_random_uuid(),
  kind public.packet_kind not null,
  status public.packet_status not null default 'queued',
  source_surface text not null,
  entity_type text,
  entity_id text,
  requested_by uuid,
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb,
  error_json jsonb,
  idempotency_key text not null,
  model text,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  lease_owner text,
  lease_expires_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packets_attempt_count_nonnegative check (attempt_count >= 0),
  constraint packets_max_attempts_positive check (max_attempts >= 1)
);

create unique index if not exists idx_packets_idempotency_key
  on public.packets (idempotency_key);
create index if not exists idx_packets_status_created_at
  on public.packets (status, created_at desc);
create index if not exists idx_packets_entity_ref
  on public.packets (entity_type, entity_id, created_at desc);
create index if not exists idx_packets_queue_claim
  on public.packets (status, lease_expires_at, created_at)
  where status in ('queued', 'running');

create table if not exists public.packet_events (
  id uuid primary key default gen_random_uuid(),
  packet_id uuid not null references public.packets(id) on delete cascade,
  event_type text not null,
  payload_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_packet_events_packet_id_created_at
  on public.packet_events (packet_id, created_at desc);

comment on table public.packets is
  'Durable packet-factory queue for advisory AI work. Service-owned; browser access stays behind API routes.';
comment on table public.packet_events is
  'Append-only audit trail for packet lifecycle transitions.';

alter table public.packets enable row level security;
alter table public.packet_events enable row level security;

revoke all on table public.packets from public, anon, authenticated;
revoke all on table public.packet_events from public, anon, authenticated;
grant all on table public.packets to service_role;
grant all on table public.packet_events to service_role;

drop policy if exists service_role_only_packets on public.packets;
drop policy if exists service_role_only_packet_events on public.packet_events;

create policy service_role_only_packets
  on public.packets
  for all
  to service_role
  using (true)
  with check (true);

create policy service_role_only_packet_events
  on public.packet_events
  for all
  to service_role
  using (true)
  with check (true);
