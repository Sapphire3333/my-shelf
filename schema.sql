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
--    • table  public.meta    (one row per shared list — genres, DNF reasons,
--                             audiences, fandoms, backgrounds, notepad skins,
--                             keyword colours and families, group pictures,
--                             the reading goal, and the deletion marks and
--                             timestamps that let two devices agree)
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

-- A page of the shelf to share (share.html): a public bucket, written only by a
-- signed-in account and changed only by whoever wrote the file. Each file holds
-- covers, titles, authors and marks, under a long random name.
insert into storage.buckets (id, name, public) values ('shares', 'shares', true)
  on conflict (id) do update set public = true;
drop policy if exists "shares insert" on storage.objects;
drop policy if exists "shares select own" on storage.objects;
drop policy if exists "shares update own" on storage.objects;
drop policy if exists "shares delete own" on storage.objects;
create policy "shares insert" on storage.objects for insert to authenticated with check (bucket_id = 'shares');
create policy "shares select own" on storage.objects for select to authenticated using (bucket_id = 'shares' and owner_id = auth.uid()::text);
create policy "shares update own" on storage.objects for update to authenticated using (bucket_id = 'shares' and owner_id = auth.uid()::text);
create policy "shares delete own" on storage.objects for delete to authenticated using (bucket_id = 'shares' and owner_id = auth.uid()::text);

-- The evening nudge (nudge-function.ts): what to say and when, the devices that
-- said yes, and the function's own keys, which no policy lets anyone read. The
-- schedule that calls the function holds this project's address, so it is shown
-- filled in by Settings -> How it works -> An evening nudge, and is not here.
create table if not exists public.nudge (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  at_min int not null default 1260, tz text not null default 'UTC', day_line int not null default 0,
  quiet_until bigint not null default 0, read_day text not null default '', said jsonb,
  last_day text not null default '', last_at bigint not null default 0, last_title text not null default '',
  unread int not null default 0, unread_from text not null default ''
);
create table if not exists public.nudge_devices (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh text not null, auth text not null, label text not null default '', added bigint not null default 0,
  last_at bigint not null default 0, last_code int not null default 0, last_text text not null default ''
);
create table if not exists public.nudge_state (
  id int primary key default 1, public_key text, private_jwk jsonb, last_tick bigint not null default 0
);
alter table public.nudge enable row level security;
alter table public.nudge_devices enable row level security;
alter table public.nudge_state enable row level security;
drop policy if exists "nudge own" on public.nudge;
drop policy if exists "nudge devices own" on public.nudge_devices;
create policy "nudge own" on public.nudge for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "nudge devices own" on public.nudge_devices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
