-- Phase 3: run once in Supabase Dashboard → SQL Editor (fixes PGRST205 / "not in schema cache").
-- After success, wait a few seconds or refresh the app.

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

drop policy if exists "category_budget_caps_select_own" on public.category_budget_caps;
create policy "category_budget_caps_select_own" on public.category_budget_caps
  for select using (auth.uid() = user_id);

drop policy if exists "category_budget_caps_insert_own" on public.category_budget_caps;
create policy "category_budget_caps_insert_own" on public.category_budget_caps
  for insert with check (auth.uid() = user_id);

drop policy if exists "category_budget_caps_update_own" on public.category_budget_caps;
create policy "category_budget_caps_update_own" on public.category_budget_caps
  for update using (auth.uid() = user_id);

drop policy if exists "category_budget_caps_delete_own" on public.category_budget_caps;
create policy "category_budget_caps_delete_own" on public.category_budget_caps
  for delete using (auth.uid() = user_id);
