-- Two-player and bot games in the cloud, plus the bot ladder per player. Run once in the SQL
-- editor on a project that already has the earlier migrations. Safe to re-run.

-- games: two-player rows and the bot's rung.
alter table public.games drop constraint if exists games_mode_check;
alter table public.games add constraint games_mode_check check (mode in ('pvp', 'bot', 'online'));
alter table public.games add column if not exists rung int check (rung between 1 and 30);

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
    where public.ladders.token_hash = excluded.token_hash;
end
$$;
grant execute on function public.save_ladder(text, text, int, int, timestamptz, int, timestamptz) to anon, authenticated;
