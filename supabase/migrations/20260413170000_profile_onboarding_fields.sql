alter table public.profiles
  add column if not exists coach_tone text,
  add column if not exists spending_weakness text;
