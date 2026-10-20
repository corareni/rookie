-- Rookie, Phase 3 schema: richer profile, personal barriers, review flow with a bin.
-- Additive only: safe to run while the current version is live. Safe to run more than once.

-- 1. Profile: structured profile, story points, AI memory import, personal barriers
alter table public.profiles
  add column if not exists profile jsonb not null default '{}'::jsonb,
  add column if not exists story_points jsonb not null default '[]'::jsonb,
  add column if not exists memory text not null default '',
  add column if not exists barriers jsonb not null default '[]'::jsonb;

-- 2. Roles: a bin, and which kind of barrier the AI flagged
alter table public.applications drop constraint if exists applications_verdict_check;
alter table public.applications
  add constraint applications_verdict_check check (verdict in ('open','barrier','ruled_out','binned'));
alter table public.applications
  add column if not exists ai_flag text check (ai_flag in ('deal_breaker','concern'));

-- 3. Usage log: allow the CV import as its own kind
alter table public.ai_runs drop constraint if exists ai_runs_kind_check;
alter table public.ai_runs
  add constraint ai_runs_kind_check check (kind in ('analyze','compare','generate','import'));
