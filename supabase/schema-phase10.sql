-- rookie phase 10: a hidden, unlimited "master" plan for the owner only. Safe to run more than once.
-- It is never offered in the app. The database refuses it for every account that isn't listed in
-- public.plan_owners, and nobody can read or change that table from the app (row level security, no policies).
-- Adding the owner's account is a separate, private step that is not stored in this public repository.

-- 1. The plan column accepts 'master'.
alter table public.user_plans drop constraint if exists user_plans_plan_check;
alter table public.user_plans add constraint user_plans_plan_check check (plan in ('free','basic','premium','master'));

-- 2. Who may hold the master plan. Only you, in the SQL editor (or the service role), can add rows.
create table if not exists public.plan_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.plan_owners enable row level security;
revoke all on public.plan_owners from anon, authenticated;

-- 3. Any insert or update that sets 'master' for someone not in plan_owners is rejected.
create or replace function public.guard_master_plan() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.plan = 'master' and not exists (select 1 from public.plan_owners o where o.user_id = new.user_id) then
    raise exception 'The master plan is not available for this account.';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_master_plan() from public, anon, authenticated;

drop trigger if exists user_plans_guard_master on public.user_plans;
create trigger user_plans_guard_master before insert or update on public.user_plans
  for each row execute function public.guard_master_plan();

-- To give the owner the plan, run privately in the SQL editor (replace the email):
--   insert into public.plan_owners (user_id) select id from auth.users where lower(email) = 'owner@example.com'
--   on conflict do nothing;
--   insert into public.user_plans (user_id, plan) select user_id, 'master' from public.plan_owners
--   on conflict (user_id) do update set plan = excluded.plan;
