-- ============================================================
--  My Shelf — Supabase schema, security, and storage setup
-- ------------------------------------------------------------
--  HOW TO RUN:
--    Supabase dashboard → SQL Editor → New query →
--    paste this whole file → press "Run".
--  It is safe to run more than once.
--
--  What it creates:
--    • table  public.books   (one row per book, JSON payload)
--    • table  public.meta    (genres, DNF reasons, audiences, tombstones)
--    • bucket storage "shelf" (covers + pictures, as JPEG files)
--    • Row Level Security so each account only ever sees its own data.
-- ============================================================

-- ---------- Tables ----------
create table if not exists public.books (
  user_id  uuid   not null default auth.uid() references auth.users (id) on delete cascade,
  id       text   not null,
  data     jsonb  not null,
  modified bigint not null default 0,
  primary key (user_id, id)
);

create table if not exists public.meta (
  user_id uuid  not null default auth.uid() references auth.users (id) on delete cascade,
  key     text  not null,
  value   jsonb not null,
  primary key (user_id, key)
);

-- ---------- Row Level Security ----------
alter table public.books enable row level security;
alter table public.meta  enable row level security;

-- books: full access to your own rows only
drop policy if exists "books select own" on public.books;
drop policy if exists "books insert own" on public.books;
drop policy if exists "books update own" on public.books;
drop policy if exists "books delete own" on public.books;
create policy "books select own" on public.books for select using (auth.uid() = user_id);
create policy "books insert own" on public.books for insert with check (auth.uid() = user_id);
create policy "books update own" on public.books for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "books delete own" on public.books for delete using (auth.uid() = user_id);

-- meta: full access to your own rows only
drop policy if exists "meta select own" on public.meta;
drop policy if exists "meta insert own" on public.meta;
drop policy if exists "meta update own" on public.meta;
drop policy if exists "meta delete own" on public.meta;
create policy "meta select own" on public.meta for select using (auth.uid() = user_id);
create policy "meta insert own" on public.meta for insert with check (auth.uid() = user_id);
create policy "meta update own" on public.meta for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "meta delete own" on public.meta for delete using (auth.uid() = user_id);

-- ---------- Storage bucket for covers & pictures ----------
insert into storage.buckets (id, name, public)
values ('shelf', 'shelf', false)
on conflict (id) do nothing;

-- Each user may only touch files inside a top-level folder named after their own uid,
-- i.e.  <user_id>/covers/<bookId>.jpg  and  <user_id>/images/<bookId>__<imgId>.jpg
drop policy if exists "shelf select own" on storage.objects;
drop policy if exists "shelf insert own" on storage.objects;
drop policy if exists "shelf update own" on storage.objects;
drop policy if exists "shelf delete own" on storage.objects;
create policy "shelf select own" on storage.objects for select
  using (bucket_id = 'shelf' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "shelf insert own" on storage.objects for insert
  with check (bucket_id = 'shelf' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "shelf update own" on storage.objects for update
  using (bucket_id = 'shelf' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "shelf delete own" on storage.objects for delete
  using (bucket_id = 'shelf' and (storage.foldername(name))[1] = auth.uid()::text);
