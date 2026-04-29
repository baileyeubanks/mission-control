-- Root Billing Documents Schema (JSONB records for flexibility)

create table if not exists public.root_quotes (
  id text primary key,
  company_account_id text not null default 'content-co-op',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.root_invoices (
  id text primary key,
  company_account_id text not null default 'content-co-op',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.root_billing_events (
  id text primary key,
  company_account_id text not null default 'content-co-op',
  entity_type text not null,
  entity_id text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_root_quotes_company on public.root_quotes(company_account_id, created_at desc);
create index if not exists idx_root_invoices_company on public.root_invoices(company_account_id, created_at desc);
create index if not exists idx_root_events_entity on public.root_billing_events(entity_type, entity_id, created_at desc);

alter table public.root_quotes enable row level security;
alter table public.root_invoices enable row level security;
alter table public.root_billing_events enable row level security;

grant all on public.root_quotes to service_role;
grant all on public.root_invoices to service_role;
grant all on public.root_billing_events to service_role;

create policy service_role_only_root_quotes on public.root_quotes for all to service_role using (true) with check (true);
create policy service_role_only_root_invoices on public.root_invoices for all to service_role using (true) with check (true);
create policy service_role_only_root_events on public.root_billing_events for all to service_role using (true) with check (true);
