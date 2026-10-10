-- Poker Settler — Supabase schema
--
-- Run this in the SQL editor of a NEW Supabase project to stand up a database
-- that matches production. Safe to re-run: every statement is idempotent.

create table if not exists games (
  code         text primary key,
  buy_in       integer not null,
  players      jsonb not null default '[]',
  settled      boolean not null default false,
  created_at   timestamptz not null default now(),
  title        text,
  password     text
);

-- Columns added after the original table shipped. Kept as explicit migrations
-- so an older database can be brought up to date by re-running this file.
alter table games add column if not exists title    text;
alter table games add column if not exists password text;
alter table games add column if not exists is_test  boolean not null default false;

-- Enable RLS
alter table games enable row level security;

-- The app talks to Supabase straight from the browser with the anon key, so
-- every policy below is intentionally open. Note that `select using (true)`
-- means any caller can list every game without knowing its code — the game
-- code is a convenience, not an access control boundary.
drop policy if exists "public read" on games;
drop policy if exists "public insert" on games;
drop policy if exists "public update" on games;
drop policy if exists "public delete" on games;

create policy "public read"   on games for select using (true);
create policy "public insert" on games for insert with check (true);
create policy "public update" on games for update using (true) with check (true);
create policy "public delete" on games for delete using (true);

-- Realtime: powers live sync of a game across everyone's phones.
-- Errors with "table is already member of publication" on a re-run, which is
-- harmless and can be ignored.
alter publication supabase_realtime add table games;
