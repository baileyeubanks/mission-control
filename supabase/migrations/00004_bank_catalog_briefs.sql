-- Bank Reconciliation, Service Catalog, and Creative Briefs Schema (JSONB)
-- Idempotent: handles existing tables with different schemas

create table if not exists public.bank_statements (
  id text primary key,
  company_account_id text not null default 'content-co-op',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.bank_transactions (
  id text primary key,
  statement_id text not null references public.bank_statements(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.catalog_items (
  id text primary key,
  company_account_id text not null default 'content-co-op',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Creative briefs: may already exist with old schema. Add missing columns.
do $$
begin
  -- Add data column if not exists
  if not exists (select 1 from information_schema.columns where table_name='creative_briefs' and column_name='data') then
    alter table public.creative_briefs add column data jsonb not null default '{}'::jsonb;
  end if;
  -- Add company_account_id if not exists
  if not exists (select 1 from information_schema.columns where table_name='creative_briefs' and column_name='company_account_id') then
    alter table public.creative_briefs add column company_account_id text not null default 'content-co-op';
  end if;
  -- Add updated_at if not exists
  if not exists (select 1 from information_schema.columns where table_name='creative_briefs' and column_name='updated_at') then
    alter table public.creative_briefs add column updated_at timestamptz not null default now();
  end if;
end
$$;

-- Indexes (idempotent)
create index if not exists idx_bank_txn_statement on public.bank_transactions(statement_id, created_at desc);
create index if not exists idx_catalog_company on public.catalog_items(company_account_id, created_at desc);
create index if not exists idx_briefs_company on public.creative_briefs(company_account_id, created_at desc);
create index if not exists idx_briefs_status on public.creative_briefs(status, created_at desc);

-- RLS (idempotent)
do $$
begin
  if not exists (select 1 from pg_policies where policyname='service_role_only_bank_statements') then
    create policy service_role_only_bank_statements on public.bank_statements for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='service_role_only_bank_transactions') then
    create policy service_role_only_bank_transactions on public.bank_transactions for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='service_role_only_catalog') then
    create policy service_role_only_catalog on public.catalog_items for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='service_role_only_briefs') then
    create policy service_role_only_briefs on public.creative_briefs for all to service_role using (true) with check (true);
  end if;
end
$$;

alter table public.bank_statements enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.catalog_items enable row level security;
alter table public.creative_briefs enable row level security;

grant all on public.bank_statements to service_role;
grant all on public.bank_transactions to service_role;
grant all on public.catalog_items to service_role;
grant all on public.creative_briefs to service_role;
