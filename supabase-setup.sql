-- Create games table
create table if not exists games (
  code        text primary key,
  buy_in      integer not null,
  players     jsonb not null default '[]',
  settled     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Enable RLS
alter table games enable row level security;

-- Public read/write (game code acts as the access token)
create policy "public read" on games for select using (true);
create policy "public insert" on games for insert with check (true);
create policy "public update" on games for update using (true) with check (true);

-- Enable realtime (run this too)
alter publication supabase_realtime add table games;
