-- Rookie, Phase 5: date, time and place of the next interview or assessment (for calendar entries).
-- Additive only, safe while live. Safe to run more than once.
alter table public.applications
  add column if not exists event_at timestamptz,
  add column if not exists event_minutes int not null default 60 check (event_minutes between 5 and 720),
  add column if not exists event_location text,
  add column if not exists event_kind text check (event_kind in ('interview','assessment','other'));
