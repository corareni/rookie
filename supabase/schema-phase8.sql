-- rookie phase 8: plans (Free, Basic, Premium) and their AI limits. No billing yet. Safe to run more than once.
-- The app already works before this runs: everyone is on Free, deep answers fall back to the quick model,
-- and the daily budget uses the old total count.

-- 1. Each user's plan. No row means Free. Users can read their own plan but never write it: only the service
--    role (later, the Stripe webhook) or you in the SQL editor can change it.
create table if not exists public.user_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','basic','premium')),
  updated_at timestamptz not null default now()
);
alter table public.user_plans enable row level security;
drop policy if exists "own plan select" on public.user_plans;
create policy "own plan select" on public.user_plans for select to authenticated using ((select auth.uid()) = user_id);
drop trigger if exists user_plans_updated_at on public.user_plans;
create trigger user_plans_updated_at before update on public.user_plans for each row execute function public.touch_updated_at();

-- 2. Deep answers (the assistant on the smarter model) are logged as their own kind.
alter table public.ai_runs drop constraint if exists ai_runs_kind_check;
alter table public.ai_runs
  add constraint ai_runs_kind_check check (kind in ('analyze','compare','generate','import','interview','library','rescore','email','chat','deep'));

-- Monthly counts per user and kind.
create index if not exists ai_runs_user_kind_day on public.ai_runs (user_id, kind, created_at);

-- 3. Today's runs per kind across all users (numbers only, no user data), for the daily spend budget.
create or replace function public.ai_runs_today_by_kind() returns table (kind text, runs bigint)
language sql security definer set search_path = '' stable as $$
  select kind, count(*) from public.ai_runs where created_at >= date_trunc('day', now()) group by kind;
$$;
revoke all on function public.ai_runs_today_by_kind() from public, anon;
grant execute on function public.ai_runs_today_by_kind() to authenticated;

-- To put someone on a plan by hand (for testing), run in the SQL editor:
--   insert into public.user_plans (user_id, plan)
--   select id, 'premium' from auth.users where email = 'someone@example.com'
--   on conflict (user_id) do update set plan = excluded.plan;
