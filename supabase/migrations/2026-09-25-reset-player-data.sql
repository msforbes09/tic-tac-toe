-- Developer reset: a device wipes its own games and ladder in the cloud. Run once in the SQL
-- editor on a project that already has the earlier migrations. Safe to re-run.
--
-- The token is checked against the ladder row (written on every finished bot game) or, failing
-- that, the player row. Series results and rooms are shared with other players and are not touched.

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

  return removed > 0;
end
$$;

grant execute on function public.reset_player_data(text, text) to anon, authenticated;
