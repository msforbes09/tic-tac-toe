-- Players, result ownership, and a games table for later. Run once in the SQL editor on a project
-- that already has schema.sql applied. Safe to re-run.

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
alter table public.results add column if not exists challenger_id text;
alter table public.results add column if not exists challenged_id text;
update public.results set challenger_id = winner_id where challenger_id is null;
update public.results set challenged_id = loser_id where challenged_id is null;
alter table public.results alter column challenger_id set not null;
alter table public.results alter column challenged_id set not null;
create index if not exists results_winner_id on public.results (winner_id, ended_at desc);
create index if not exists results_loser_id on public.results (loser_id, ended_at desc);

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
