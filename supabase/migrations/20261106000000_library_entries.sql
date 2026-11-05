-- Library sync: one row per (user, manga).
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create table if not exists public.library_entries (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  manga_id text not null check (char_length(manga_id) between 1 and 64),

  title text not null check (char_length(title) <= 500),
  titles jsonb not null default '{}'::jsonb,
  description text not null default '' check (char_length(description) <= 20000),
  cover_image text not null default '' check (char_length(cover_image) <= 2000),
  total_chapters integer not null default 0 check (total_chapters >= 0),
  current_chapter integer not null default 0 check (current_chapter >= 0),
  status text not null check (status in ('READING', 'PLAN_TO_READ', 'COMPLETED', 'DROPPED')),
  rating text not null default 'N/A' check (char_length(rating) <= 16),
  is_adult boolean not null default false,
  last_updated text not null default '' check (char_length(last_updated) <= 32),

  latest_chapter numeric check (latest_chapter is null or latest_chapter >= 0),
  latest_chapter_url text check (latest_chapter_url is null or char_length(latest_chapter_url) <= 2000),
  latest_chapter_checked_at timestamptz,

  created_at timestamptz not null default now(),
  -- Set by the client on every change; used for "last write wins" between devices.
  updated_at timestamptz not null default now(),

  primary key (user_id, manga_id)
);

-- Row Level Security: every signed-in user sees and changes only their own rows.
alter table public.library_entries enable row level security;

drop policy if exists "Users read own library" on public.library_entries;
create policy "Users read own library" on public.library_entries
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users add to own library" on public.library_entries;
create policy "Users add to own library" on public.library_entries
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own library" on public.library_entries;
create policy "Users update own library" on public.library_entries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete from own library" on public.library_entries;
create policy "Users delete from own library" on public.library_entries
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- The project does not expose new tables automatically, so grant access
-- explicitly: signed-in users only (RLS above still limits them to their rows).
revoke all on public.library_entries from anon;
grant select, insert, update, delete on public.library_entries to authenticated;
