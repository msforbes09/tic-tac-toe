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
  mode text not null check (mode in ('pvp', 'bot', 'online')),
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  rung int check (rung between 1 and 30),
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

-- ladders: the adaptive bot's state per player, renamed only with the device's secret token.
create table if not exists public.ladders (
  player_id text primary key,
  token_hash text not null,
  rung int check (rung between 1 and 30),
  streak int not null default 0,
  top_held_at timestamptz,
  top_held_count int not null default 0 check (top_held_count >= 0),
  updated_at timestamptz not null default now()
);
alter table public.ladders enable row level security;
drop policy if exists "ladders are public" on public.ladders;
create policy "ladders are public" on public.ladders for select to anon, authenticated using (true);

create or replace function public.save_ladder(
  p_id text, p_token text, p_rung int, p_streak int, p_top_held_at timestamptz, p_top_held_count int, p_updated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hashed text := encode(extensions.digest(p_token, 'sha256'), 'hex');
begin
  insert into public.ladders (player_id, token_hash, rung, streak, top_held_at, top_held_count, updated_at)
  values (p_id, hashed, p_rung, p_streak, p_top_held_at, p_top_held_count, p_updated_at)
  on conflict (player_id) do update
    set rung = excluded.rung,
        streak = excluded.streak,
        top_held_at = excluded.top_held_at,
        top_held_count = excluded.top_held_count,
        updated_at = excluded.updated_at
    where public.ladders.token_hash = excluded.token_hash
      and excluded.updated_at >= public.ladders.updated_at;
end
$$;
grant execute on function public.save_ladder(text, text, int, int, timestamptz, int, timestamptz) to anon, authenticated;
-- achievements: one row per device, written only through save_achievements with the device's token.
-- The badge column holds an achievement id, null for None, or 'default' when the player never chose.
create table if not exists public.achievements (
  player_id text primary key,
  token_hash text not null,
  unlocks jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  -- An achievement id, null for None, or 'default' when the player never chose.
  badge text,
  updated_at timestamptz not null default now()
);
alter table public.achievements enable row level security;
drop policy if exists "achievements are public" on public.achievements;
create policy "achievements are public" on public.achievements for select to anon, authenticated using (true);

create or replace function public.save_achievements(
  p_id text, p_token text, p_unlocks jsonb, p_progress jsonb, p_badge text, p_updated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hashed text := encode(extensions.digest(p_token, 'sha256'), 'hex');
begin
  insert into public.achievements (player_id, token_hash, unlocks, progress, badge, updated_at)
  values (p_id, hashed, p_unlocks, p_progress, p_badge, p_updated_at)
  on conflict (player_id) do update
    set unlocks = excluded.unlocks,
        progress = excluded.progress,
        badge = excluded.badge,
        updated_at = excluded.updated_at
    where public.achievements.token_hash = excluded.token_hash
      and excluded.updated_at >= public.achievements.updated_at;
end
$$;
grant execute on function public.save_achievements(text, text, jsonb, jsonb, text, timestamptz) to anon, authenticated;

-- Developer reset: a device wipes its own games, ladder, and achievements in the cloud. The token is
-- checked against the ladder row, the achievements row, or the player row. Series results and rooms
-- are shared with other players and are not touched.
create or replace function public.reset_player_data(p_id text, p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  hashed text := encode(extensions.digest(p_token, 'sha256'), 'hex');
  owner text;
  removed int := 0;
  n int;
begin
  select token_hash into owner from public.ladders where player_id = p_id;
  if owner is null then
    select token_hash into owner from public.achievements where player_id = p_id;
  end if;
  if owner is null then
    select token_hash into owner from public.players where id = p_id;
  end if;
  if owner is null or owner <> hashed then
    return false;
  end if;

  delete from public.games where player_id = p_id;
  get diagnostics n = row_count;
  removed := removed + n;

  delete from public.ladders where player_id = p_id;
  get diagnostics n = row_count;
  removed := removed + n;

  delete from public.achievements where player_id = p_id;
  get diagnostics n = row_count;
  removed := removed + n;

  return removed > 0;
end
$$;
grant execute on function public.reset_player_data(text, text) to anon, authenticated;

-- The full reset, by hand only and never as part of a migration run. Every device that had
-- registered wipes its own local game data on its next launch.
--
-- truncate public.rooms, public.results, public.players, public.games, public.ladders, public.achievements;
