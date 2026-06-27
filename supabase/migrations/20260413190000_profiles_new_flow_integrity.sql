-- Align profile data integrity with onboarding + coach flow.
alter table public.profiles
  add column if not exists coach_tone text,
  add column if not exists spending_weakness text,
  add column if not exists notifications_enabled boolean not null default true;

-- Normalize legacy values before constraints.
update public.profiles
set user_type = lower(trim(user_type))
where user_type is not null;

update public.profiles
set coach_tone = lower(trim(coach_tone))
where coach_tone is not null;

update public.profiles
set spending_weakness = lower(trim(spending_weakness))
where spending_weakness is not null;

alter table public.profiles
  drop constraint if exists profiles_user_type_check;
alter table public.profiles
  add constraint profiles_user_type_check
  check (
    user_type is null
    or user_type in ('student', 'individual', 'freelancer', 'business')
  );

alter table public.profiles
  drop constraint if exists profiles_coach_tone_check;
alter table public.profiles
  add constraint profiles_coach_tone_check
  check (
    coach_tone is null
    or coach_tone in ('just_starting', 'optimizing', 'freedom', 'stability')
  );

alter table public.profiles
  drop constraint if exists profiles_spending_weakness_check;
alter table public.profiles
  add constraint profiles_spending_weakness_check
  check (
    spending_weakness is null
    or spending_weakness in ('dining', 'shopping', 'subscriptions', 'coffee', 'transport', 'other')
  );

alter table public.profiles
  drop constraint if exists profiles_primary_goal_id_fkey;
alter table public.profiles
  add constraint profiles_primary_goal_id_fkey
  foreign key (primary_goal_id) references public.goals (id) on delete set null;

create or replace function public.validate_profile_primary_goal_owner()
returns trigger
language plpgsql
as $$
declare
  owner_id uuid;
begin
  if new.primary_goal_id is null then
    return new;
  end if;

  select g.user_id into owner_id
  from public.goals g
  where g.id = new.primary_goal_id;

  if owner_id is null then
    raise exception 'primary_goal_id does not exist';
  end if;

  if owner_id <> new.id then
    raise exception 'primary_goal_id must belong to the same user';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_validate_primary_goal_owner on public.profiles;
create trigger profiles_validate_primary_goal_owner
before insert or update of primary_goal_id on public.profiles
for each row execute function public.validate_profile_primary_goal_owner();
