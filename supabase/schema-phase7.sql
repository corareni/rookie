-- rookie phase 7: more than one Gmail account per user. Safe to run more than once.

alter table public.gmail_connections add column if not exists id uuid not null default gen_random_uuid();

-- One row per (user, Gmail address) instead of one per user.
alter table public.gmail_connections drop constraint if exists gmail_connections_pkey;
alter table public.gmail_connections add constraint gmail_connections_pkey primary key (id);
create unique index if not exists gmail_connections_user_email on public.gmail_connections (user_id, email);
