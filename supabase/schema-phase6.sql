-- Rookie phase 6: notifications, Gmail connection, AI kinds for re-scoring and inbox checks.
-- Safe to run more than once.

-- 1. Notifications (the bell in the header)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- One row per event, e.g. 'deadline:<role id>:2026-10-24', so it isn't created twice.
  key text not null,
  kind text not null check (kind in ('analysed','score','deadline','event','email','profile')),
  title text not null check (char_length(title) <= 200),
  body text not null default '' check (char_length(body) <= 600),
  href text,
  application_id uuid references public.applications(id) on delete cascade,
  -- An update suggested from an email, applied only when the user accepts it.
  data jsonb,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "own notifications select" on public.notifications;
drop policy if exists "own notifications insert" on public.notifications;
drop policy if exists "own notifications update" on public.notifications;
drop policy if exists "own notifications delete" on public.notifications;
create policy "own notifications select" on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
create policy "own notifications insert" on public.notifications for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own notifications update" on public.notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own notifications delete" on public.notifications for delete to authenticated using ((select auth.uid()) = user_id);

-- 2. Gmail connection (read-only access the user grants; one per user)
create table if not exists public.gmail_connections (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  email text,
  refresh_token text not null,
  last_checked_at timestamptz,
  -- Message ids already read, so an email is never analysed twice.
  seen text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.gmail_connections enable row level security;
drop policy if exists "own gmail select" on public.gmail_connections;
drop policy if exists "own gmail insert" on public.gmail_connections;
drop policy if exists "own gmail update" on public.gmail_connections;
drop policy if exists "own gmail delete" on public.gmail_connections;
create policy "own gmail select" on public.gmail_connections for select to authenticated using ((select auth.uid()) = user_id);
create policy "own gmail insert" on public.gmail_connections for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own gmail update" on public.gmail_connections for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own gmail delete" on public.gmail_connections for delete to authenticated using ((select auth.uid()) = user_id);

-- 3. New AI usage kinds
alter table public.ai_runs drop constraint if exists ai_runs_kind_check;
alter table public.ai_runs
  add constraint ai_runs_kind_check check (kind in ('analyze','compare','generate','import','interview','library','rescore','email','chat'));

-- 4. A short name for "Other" calendar events (e.g. "Coffee chat with recruiter")
alter table public.applications
  add column if not exists event_note text check (char_length(event_note) <= 120);
