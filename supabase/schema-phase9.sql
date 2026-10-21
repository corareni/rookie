-- rookie phase 9: waiting list for the paid plans. Safe to run more than once.
-- The app works before this runs: the Profile box just says the list opens soon.

-- One row per user: which plan they'd want, what they'd use most, and an optional note.
-- Deleting an account deletes its row (on delete cascade). The email is not copied here; it stays in auth.users.
create table if not exists public.waitlist (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null check (plan in ('basic','premium','unsure')),
  wants text[] not null default '{}',
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.waitlist enable row level security;

drop policy if exists "own waitlist select" on public.waitlist;
create policy "own waitlist select" on public.waitlist for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "own waitlist insert" on public.waitlist;
create policy "own waitlist insert" on public.waitlist for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "own waitlist update" on public.waitlist;
create policy "own waitlist update" on public.waitlist for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "own waitlist delete" on public.waitlist;
create policy "own waitlist delete" on public.waitlist for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists waitlist_updated_at on public.waitlist;
create trigger waitlist_updated_at before update on public.waitlist for each row execute function public.touch_updated_at();

-- To see who's interested, run in the SQL editor (only you can, as the project owner):
--   select u.email, w.plan, w.wants, w.note, w.created_at
--   from public.waitlist w join auth.users u on u.id = w.user_id order by w.created_at desc;
-- Totals per plan, and what people want most:
--   select plan, count(*) from public.waitlist group by plan;
--   select want, count(*) from public.waitlist, unnest(wants) as want group by want order by 2 desc;
