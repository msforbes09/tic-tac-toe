-- Rooms and series results for online play. Run once in the Supabase SQL editor.
-- The app talks to these tables with the publishable key only; Row Level Security below is the
-- whole access model. Deleting a room needs the creator's secret token, checked by delete_room.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.rooms (
  id text primary key,
  name text not null,
  creator_id text not null,
  owner_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.results (
  id text primary key,                        -- the series' gameId; inserting twice is a no-op
  room_id text not null references public.rooms(id) on delete cascade,
  challenger_id text not null,
  challenged_id text not null,
  winner_id text not null,
  winner_name text not null,
  loser_id text not null,
  loser_name text not null,
  winner_score int not null check (winner_score >= 0),
  loser_score int not null check (loser_score >= 0),
  games int not null check (games >= 0),
  reason text not null check (reason in ('decided', 'resigned', 'left')),
  ended_at timestamptz not null default now()
);

create index if not exists results_room_id_ended_at on public.results (room_id, ended_at desc);

alter table public.rooms enable row level security;
alter table public.results enable row level security;

drop policy if exists "rooms are public" on public.rooms;
drop policy if exists "anyone can create a room" on public.rooms;
drop policy if exists "results are public" on public.results;
drop policy if exists "anyone can add a result" on public.results;

create policy "rooms are public"         on public.rooms   for select to anon, authenticated using (true);
create policy "anyone can create a room" on public.rooms   for insert to anon, authenticated with check (true);
create policy "results are public"       on public.results for select to anon, authenticated using (true);
create policy "anyone can add a result"  on public.results for insert to anon, authenticated with check (true);

-- Only the creator's device knows the token; its SHA-256 hex is what the row stores.
create or replace function public.delete_room(room_id text, token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  removed int;
begin
  delete from public.rooms
   where id = room_id
     and owner_hash = encode(extensions.digest(token, 'sha256'), 'hex');
  get diagnostics removed = row_count;
  return removed > 0;
end
$$;

grant execute on function public.delete_room(text, text) to anon, authenticated;

-- Live updates for the room list and results. Guarded so the script can be re-run.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'results'
  ) then
    alter publication supabase_realtime add table public.results;
  end if;
end
$$;
-- Players: one row per device, renamable only with the device's secret token.
create table if not exists public.players (
  id text primary key,
  nickname text not null,
  token_hash text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
alter table public.players enable row level security;
drop policy if exists "players are public" on public.players;
create policy "players are public" on public.players for select to anon, authenticated using (true);

create or replace function public.upsert_player(p_id text, p_token text, p_nickname text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hashed text := encode(extensions.digest(p_token, 'sha256'), 'hex');
begin
  insert into public.players (id, nickname, token_hash)
  values (p_id, p_nickname, hashed)
  on conflict (id) do update
    set nickname = excluded.nickname,
        last_seen_at = now()
    where public.players.token_hash = excluded.token_hash;
end
$$;
grant execute on function public.upsert_player(text, text, text) to anon, authenticated;

-- Results remember who challenged whom, so the room can show the challenger on the left.

-- Individual games, ready for bot history later. Not written by the app yet.
create table if not exists public.games (
  id text primary key,
  player_id text not null,
  mode text not null check (mode in ('bot', 'online')),
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  outcome text not null check (outcome in ('won', 'lost', 'draw')),
  symbol text not null check (symbol in ('X', 'O')),
  opponent_id text,
  series_id text,
  played_at timestamptz not null default now()
);
create index if not exists games_player_played on public.games (player_id, played_at desc);
alter table public.games enable row level security;
drop policy if exists "games are public" on public.games;
drop policy if exists "anyone can add a game" on public.games;
create policy "games are public"     on public.games for select to anon, authenticated using (true);
create policy "anyone can add a game" on public.games for insert to anon, authenticated with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'players'
  ) then
    alter publication supabase_realtime add table public.players;
  end if;
end
$$;
