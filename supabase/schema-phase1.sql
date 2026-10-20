-- Rookie, Phase 1 schema. Paste into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 500),
  status text not null default 'interested'
    check (status in ('interested','submitted','assessment','interview','offer','rejected','withdrawn')),
  deadline date,
  submitted_on date,
  assessment_on date,
  interview_on date,
  offer_on date,
  notes text not null default '',
  -- filled by Phase 2 (nullable, safe to have from the start)
  job_url text,
  job_status text not null default 'none' check (job_status in ('none','reading','ready','failed')),
  company text,
  role text,
  location text,
  job jsonb,
  company_brief jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists applications_user_idx on public.applications (user_id, created_at desc);
alter table public.applications enable row level security;

drop policy if exists "own applications select" on public.applications;
drop policy if exists "own applications insert" on public.applications;
drop policy if exists "own applications update" on public.applications;
drop policy if exists "own applications delete" on public.applications;
create policy "own applications select" on public.applications for select to authenticated using ((select auth.uid()) = user_id);
create policy "own applications insert" on public.applications for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own applications update" on public.applications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own applications delete" on public.applications for delete to authenticated using ((select auth.uid()) = user_id);

-- updated_at + first-reached dates for each stage (set once, editable afterwards)
create or replace function public.applications_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  if new.status = 'submitted'  and new.submitted_on  is null then new.submitted_on  = current_date; end if;
  if new.status = 'assessment' and new.assessment_on is null then new.assessment_on = current_date; end if;
  if new.status = 'interview'  and new.interview_on  is null then new.interview_on  = current_date; end if;
  if new.status = 'offer'      and new.offer_on      is null then new.offer_on      = current_date; end if;
  return new;
end; $$;
drop trigger if exists applications_before_write on public.applications;
create trigger applications_before_write before insert or update on public.applications
  for each row execute function public.applications_before_write();

-- "Delete my account and data": removes only the logged-in user (rows cascade).
create or replace function public.delete_me() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  delete from auth.users where id = auth.uid();
end; $$;
revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;
