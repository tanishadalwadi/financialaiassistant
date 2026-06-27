-- Run this in Supabase Dashboard → SQL Editor (new project).
-- Enables RLS so each user only sees their own rows.

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  user_type text default 'individual',
  monthly_income numeric default 0,
  monthly_savings_target numeric default 0,
  notifications_enabled boolean not null default true,
  coach_tone text,
  spending_weakness text,
  primary_goal_id uuid,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Goals
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  type text not null default 'other',
  target_amount numeric not null,
  saved_amount numeric not null default 0,
  due_date date not null,
  priority text not null default 'medium',
  emoji text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_user_id_idx on public.goals (user_id);

alter table public.goals enable row level security;

create policy "goals_select_own" on public.goals for select using (auth.uid() = user_id);
create policy "goals_insert_own" on public.goals for insert with check (auth.uid() = user_id);
create policy "goals_update_own" on public.goals for update using (auth.uid() = user_id);
create policy "goals_delete_own" on public.goals for delete using (auth.uid() = user_id);

-- Statement imports (one row per imported CSV / source statement)
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

create policy "statement_imports_select_own" on public.statement_imports
  for select using (auth.uid() = user_id);
create policy "statement_imports_insert_own" on public.statement_imports
  for insert with check (auth.uid() = user_id);
create policy "statement_imports_update_own" on public.statement_imports
  for update using (auth.uid() = user_id);
create policy "statement_imports_delete_own" on public.statement_imports
  for delete using (auth.uid() = user_id);

-- Transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  description text not null,
  amount numeric not null,
  category text not null,
  is_income boolean not null default false,
  category_label text,
  import_id uuid references public.statement_imports (id) on delete set null,
  fingerprint text,
  source text,
  institution text,
  account_name text,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_id_idx on public.transactions (user_id);
create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);
create index if not exists transactions_user_import_idx on public.transactions (user_id, import_id);
create index if not exists transactions_user_fingerprint_idx on public.transactions (user_id, fingerprint);
create unique index if not exists transactions_user_fingerprint_unique
  on public.transactions (user_id, fingerprint)
  where fingerprint is not null;

alter table public.transactions enable row level security;

create policy "transactions_select_own" on public.transactions for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions for update using (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions for delete using (auth.uid() = user_id);

-- Monthly financial snapshots (one row per user/month, recomputed on imports + manual edits)
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

create policy "monthly_snapshots_select_own" on public.monthly_financial_snapshots
  for select using (auth.uid() = user_id);
create policy "monthly_snapshots_insert_own" on public.monthly_financial_snapshots
  for insert with check (auth.uid() = user_id);
create policy "monthly_snapshots_update_own" on public.monthly_financial_snapshots
  for update using (auth.uid() = user_id);
create policy "monthly_snapshots_delete_own" on public.monthly_financial_snapshots
  for delete using (auth.uid() = user_id);

-- AI coach threads (optional until you wire Gemini)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create index if not exists conversations_user_id_idx on public.conversations (user_id);

alter table public.conversations enable row level security;

create policy "conversations_select_own" on public.conversations for select using (auth.uid() = user_id);
create policy "conversations_insert_own" on public.conversations for insert with check (auth.uid() = user_id);
create policy "conversations_update_own" on public.conversations for update using (auth.uid() = user_id);
create policy "conversations_delete_own" on public.conversations for delete using (auth.uid() = user_id);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);

alter table public.ai_messages enable row level security;

create policy "ai_messages_select_via_conversation" on public.ai_messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "ai_messages_insert_via_conversation" on public.ai_messages
  for insert with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "ai_messages_delete_via_conversation" on public.ai_messages
  for delete using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

-- Phase 3: monthly spend caps per category (synced from Insights UI)
create table if not exists public.category_budget_caps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (char_length(trim(category)) > 0),
  cap_amount numeric not null check (cap_amount > 0),
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

create index if not exists category_budget_caps_user_idx on public.category_budget_caps (user_id);

alter table public.category_budget_caps enable row level security;

create policy "category_budget_caps_select_own" on public.category_budget_caps
  for select using (auth.uid() = user_id);

create policy "category_budget_caps_insert_own" on public.category_budget_caps
  for insert with check (auth.uid() = user_id);

create policy "category_budget_caps_update_own" on public.category_budget_caps
  for update using (auth.uid() = user_id);

create policy "category_budget_caps_delete_own" on public.category_budget_caps
  for delete using (auth.uid() = user_id);
