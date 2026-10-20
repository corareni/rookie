-- Rookie, Phase 2 schema (AI analysis, profile, documents, comparisons, usage limits).
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run more than once.

-- 1. AI analysis fields on each role
alter table public.applications
  add column if not exists score int check (score between 1 and 10),
  add column if not exists track text,
  add column if not exists what text,
  add column if not exists why text,
  add column if not exists risk text,
  add column if not exists timing text,
  add column if not exists closes_note text,
  add column if not exists verdict text not null default 'open' check (verdict in ('open','barrier','ruled_out')),
  add column if not exists verdict_reason text,
  add column if not exists next_step text,
  add column if not exists job_text text,
  add column if not exists analyzed_at timestamptz;

-- 2. Profile: CV, story, hard rules (one row per user)
create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  cv_text text not null default '',
  story text not null default '',
  rules text not null default '',
  writing_notes text not null default '',
  contact jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "own profile select" on public.profiles;
drop policy if exists "own profile insert" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
drop policy if exists "own profile delete" on public.profiles;
create policy "own profile select" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "own profile insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own profile update" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own profile delete" on public.profiles for delete to authenticated using ((select auth.uid()) = user_id);

-- 3. Tailored CV and cover letter per role
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  kind text not null check (kind in ('cv','cover_letter')),
  content jsonb not null,
  meta jsonb not null default '{}'::jsonb,
  edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, kind)
);
alter table public.documents enable row level security;
drop policy if exists "own documents select" on public.documents;
drop policy if exists "own documents insert" on public.documents;
drop policy if exists "own documents update" on public.documents;
drop policy if exists "own documents delete" on public.documents;
create policy "own documents select" on public.documents for select to authenticated using ((select auth.uid()) = user_id);
create policy "own documents insert" on public.documents for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own documents update" on public.documents for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own documents delete" on public.documents for delete to authenticated using ((select auth.uid()) = user_id);

-- 4. Saved comparisons
create table if not exists public.comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  application_ids uuid[] not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.comparisons enable row level security;
drop policy if exists "own comparisons select" on public.comparisons;
drop policy if exists "own comparisons insert" on public.comparisons;
drop policy if exists "own comparisons delete" on public.comparisons;
create policy "own comparisons select" on public.comparisons for select to authenticated using ((select auth.uid()) = user_id);
create policy "own comparisons insert" on public.comparisons for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own comparisons delete" on public.comparisons for delete to authenticated using ((select auth.uid()) = user_id);

-- 5. AI usage log for daily limits (users can add and read their own rows, never edit them)
create table if not exists public.ai_runs (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('analyze','compare','generate')),
  ok boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists ai_runs_user_day on public.ai_runs (user_id, created_at);
alter table public.ai_runs enable row level security;
drop policy if exists "own runs select" on public.ai_runs;
drop policy if exists "own runs insert" on public.ai_runs;
create policy "own runs select" on public.ai_runs for select to authenticated using ((select auth.uid()) = user_id);
create policy "own runs insert" on public.ai_runs for insert to authenticated with check ((select auth.uid()) = user_id);

-- Total AI runs today across all users (a number only, no user data), for the global safety cap.
create or replace function public.ai_runs_today_global() returns bigint
language sql security definer set search_path = '' stable as $$
  select count(*) from public.ai_runs where created_at >= date_trunc('day', now());
$$;
revoke all on function public.ai_runs_today_global() from public, anon;
grant execute on function public.ai_runs_today_global() to authenticated;

-- updated_at triggers
drop trigger if exists profiles_updated_at on public.profiles;
drop trigger if exists documents_updated_at on public.documents;
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger documents_updated_at before update on public.documents for each row execute function public.touch_updated_at();
