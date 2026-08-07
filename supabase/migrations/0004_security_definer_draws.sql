-- draw_word / draw_song both UPDATE words/songs (stamping last_used_at for
-- repetition protection), but they were plain SECURITY INVOKER functions:
-- called with the anon key, that update runs under RLS, and words/songs
-- only have a SELECT policy. With no UPDATE policy the update silently
-- matches zero rows, so both functions returned an empty set and every
-- draw failed with "No words left to draw".
--
-- Fix: run both functions as SECURITY DEFINER — they execute with the
-- function owner's permissions for just this one controlled operation,
-- rather than granting the public anon key blanket UPDATE rights over the
-- whole word bank. search_path is pinned as standard hygiene for
-- SECURITY DEFINER functions. Safe to re-run.

create or replace function draw_word(p_category text, p_exclude_fraction real default 0.2)
returns table (id uuid, prompt text, category text) as $$
declare
  v_pool_size int;
  v_exclude_count int;
  v_threshold timestamptz;
begin
  select count(*) into v_pool_size from words w where w.category = p_category;
  v_exclude_count := floor(v_pool_size * p_exclude_fraction);

  select w.last_used_at into v_threshold
  from words w
  where w.category = p_category and w.last_used_at is not null
  order by w.last_used_at desc
  offset greatest(v_exclude_count - 1, 0) limit 1;

  return query
  update words w
  set last_used_at = now()
  where w.id = (
    select w2.id from words w2
    where w2.category = p_category
      and (w2.last_used_at is null or v_threshold is null or w2.last_used_at < v_threshold)
    order by random()
    limit 1
  )
  returning w.id, w.prompt, w.category;
end;
$$ language plpgsql volatile security definer set search_path = public;

create or replace function draw_song(p_exclude_fraction real default 0.2)
returns table (id uuid, title text, artist text) as $$
declare
  v_pool_size int;
  v_exclude_count int;
  v_threshold timestamptz;
begin
  select count(*) into v_pool_size from songs;
  v_exclude_count := floor(v_pool_size * p_exclude_fraction);

  select s.last_used_at into v_threshold
  from songs s
  where s.last_used_at is not null
  order by s.last_used_at desc
  offset greatest(v_exclude_count - 1, 0) limit 1;

  return query
  update songs s
  set last_used_at = now()
  where s.id = (
    select s2.id from songs s2
    where (s2.last_used_at is null or v_threshold is null or s2.last_used_at < v_threshold)
    order by random()
    limit 1
  )
  returning s.id, s.title, s.artist;
end;
$$ language plpgsql volatile security definer set search_path = public;

grant execute on function draw_word(text, real) to anon;
grant execute on function draw_song(real) to anon;
