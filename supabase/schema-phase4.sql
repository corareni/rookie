-- Rookie, Phase 4: interview prep, saved documents, a private file library.
-- Additive only, safe while live. Safe to run more than once.

-- 1. Interview practice questions per role
alter table public.applications add column if not exists interview_prep jsonb;

-- 2. Snapshots of the CV and letter you sent (kept even if you regenerate later)
create table if not exists public.saved_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  label text not null default '',
  kind text not null check (kind in ('cv','cover_letter')),
  content jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.saved_documents enable row level security;
drop policy if exists "own saved select" on public.saved_documents;
drop policy if exists "own saved insert" on public.saved_documents;
drop policy if exists "own saved delete" on public.saved_documents;
create policy "own saved select" on public.saved_documents for select to authenticated using ((select auth.uid()) = user_id);
create policy "own saved insert" on public.saved_documents for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own saved delete" on public.saved_documents for delete to authenticated using ((select auth.uid()) = user_id);

-- 3. Your own uploaded letters and CVs (files live in the private "library" bucket)
create table if not exists public.library_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  path text not null,
  kind text not null default 'cover_letter' check (kind in ('cover_letter','cv','other')),
  text text not null default '',
  size int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.library_files enable row level security;
drop policy if exists "own library select" on public.library_files;
drop policy if exists "own library insert" on public.library_files;
drop policy if exists "own library update" on public.library_files;
drop policy if exists "own library delete" on public.library_files;
create policy "own library select" on public.library_files for select to authenticated using ((select auth.uid()) = user_id);
create policy "own library insert" on public.library_files for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own library update" on public.library_files for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own library delete" on public.library_files for delete to authenticated using ((select auth.uid()) = user_id);

-- Private storage bucket; each user can only touch files in their own folder (<user id>/...)
insert into storage.buckets (id, name, public, file_size_limit)
values ('library', 'library', false, 10485760)
on conflict (id) do update set public = false;
drop policy if exists "library read own" on storage.objects;
drop policy if exists "library insert own" on storage.objects;
drop policy if exists "library delete own" on storage.objects;
create policy "library read own" on storage.objects for select to authenticated
  using (bucket_id = 'library' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "library insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'library' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "library delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'library' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 4. New AI usage kinds
alter table public.ai_runs drop constraint if exists ai_runs_kind_check;
alter table public.ai_runs
  add constraint ai_runs_kind_check check (kind in ('analyze','compare','generate','import','interview','library'));
