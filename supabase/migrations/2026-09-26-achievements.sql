-- Achievements: one row per device, written only through save_achievements with the device's
-- token. Run once in the SQL editor on a project that already has the earlier migrations. Safe to
-- re-run. See docs/superpowers/specs/2026-09-26-achievements-design.md.

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

-- The developer reset now also removes the achievements row, and accepts the token from it.
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
