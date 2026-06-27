-- ──────────────────────────────────────────────────────────────────────────
-- Statement import sessions + monthly snapshots + transaction de-duplication.
--
-- Run once in Supabase Dashboard → SQL Editor on existing projects.
-- Idempotent: every statement uses `if not exists` / `drop ... if exists`.
-- ──────────────────────────────────────────────────────────────────────────

-- 1) Statement import sessions ────────────────────────────────────────────
create table if not exists public.statement_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text,
  source text not null default 'csv',
  institution text,
  account_name text,
  account_type text,
  statement_start_date date,
  statement_end_date date,
  month_label text,
  transaction_count int not null default 0,
  duplicate_count int not null default 0,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists statement_imports_user_idx
  on public.statement_imports (user_id, imported_at desc);

alter table public.statement_imports enable row level security;

drop policy if exists "statement_imports_select_own" on public.statement_imports;
create policy "statement_imports_select_own" on public.statement_imports
  for select using (auth.uid() = user_id);

drop policy if exists "statement_imports_insert_own" on public.statement_imports;
create policy "statement_imports_insert_own" on public.statement_imports
  for insert with check (auth.uid() = user_id);

drop policy if exists "statement_imports_update_own" on public.statement_imports;
create policy "statement_imports_update_own" on public.statement_imports
  for update using (auth.uid() = user_id);

drop policy if exists "statement_imports_delete_own" on public.statement_imports;
create policy "statement_imports_delete_own" on public.statement_imports
  for delete using (auth.uid() = user_id);


-- 2) Transactions: link to import sessions + duplicate fingerprint ────────
alter table public.transactions
  add column if not exists import_id uuid
    references public.statement_imports (id) on delete set null;

alter table public.transactions
  add column if not exists fingerprint text;

alter table public.transactions
  add column if not exists source text;

alter table public.transactions
  add column if not exists institution text;

alter table public.transactions
  add column if not exists account_name text;

create index if not exists transactions_user_import_idx
  on public.transactions (user_id, import_id);

-- design-system.md spec keeps the existing (user_id, date desc) index too.
create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc);

create index if not exists transactions_user_fingerprint_idx
  on public.transactions (user_id, fingerprint);

-- Partial unique index: allows null fingerprints (legacy / pre-import rows),
-- enforces uniqueness when present.
create unique index if not exists transactions_user_fingerprint_unique
  on public.transactions (user_id, fingerprint)
  where fingerprint is not null;


-- 3) Monthly financial snapshots ──────────────────────────────────────────
create table if not exists public.monthly_financial_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month date not null,
  month_label text not null,
  total_income numeric not null default 0,
  total_expenses numeric not null default 0,
  surplus numeric not null default 0,
  savings_rate numeric,
  top_category text,
  top_category_amount numeric not null default 0,
  transaction_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

create index if not exists monthly_snapshots_user_month_idx
  on public.monthly_financial_snapshots (user_id, month desc);

alter table public.monthly_financial_snapshots enable row level security;

drop policy if exists "monthly_snapshots_select_own" on public.monthly_financial_snapshots;
create policy "monthly_snapshots_select_own" on public.monthly_financial_snapshots
  for select using (auth.uid() = user_id);

drop policy if exists "monthly_snapshots_insert_own" on public.monthly_financial_snapshots;
create policy "monthly_snapshots_insert_own" on public.monthly_financial_snapshots
  for insert with check (auth.uid() = user_id);

drop policy if exists "monthly_snapshots_update_own" on public.monthly_financial_snapshots;
create policy "monthly_snapshots_update_own" on public.monthly_financial_snapshots
  for update using (auth.uid() = user_id);

drop policy if exists "monthly_snapshots_delete_own" on public.monthly_financial_snapshots;
create policy "monthly_snapshots_delete_own" on public.monthly_financial_snapshots
  for delete using (auth.uid() = user_id);
