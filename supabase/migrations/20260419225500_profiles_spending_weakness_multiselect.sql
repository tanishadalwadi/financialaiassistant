-- Allow storing multiple onboarding weaknesses and custom "other" values.
-- Examples:
--   dining
--   dining,coffee,transport
--   dining,other:impulse online buys
alter table if exists public.profiles
  drop constraint if exists profiles_spending_weakness_check;

alter table if exists public.profiles
  add constraint profiles_spending_weakness_check
  check (
    spending_weakness is null
    or spending_weakness ~ '^[a-z_]+(?::[a-z0-9 _-]+)?(,[a-z_]+(?::[a-z0-9 _-]+)?)*$'
  );
