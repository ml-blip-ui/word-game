-- Repetition protection never actually engaged.
--
-- The old implementation found a cut-off timestamp by asking for the Nth
-- most-recently-used word (offset N-1 limit 1). Until N words in a category
-- had genuinely been used, that query returned no row, leaving v_threshold
-- NULL — and the eligibility test treated a NULL threshold as "everything
-- is eligible". With N = 300 per category, that meant no protection at all
-- for the first ~300 words of each category, i.e. for the first dozen-plus
-- games: words were drawn at random *with replacement*, so the same word
-- could come back the very next turn.
--
-- Rewritten to exclude the most-recently-used slice by rank rather than by
-- timestamp, which behaves correctly from the very first draw: with nothing
-- used yet the excluded set is simply empty, and every unused word is
-- eligible. Safe to re-run; existing last_used_at values are kept and
-- remain meaningful.

create or replace function draw_word(p_category text, p_exclude_fraction real default 0.2)
returns table (id uuid, prompt text, category text) as $$
declare
  v_pool_size int;
  v_exclude_count int;
  v_chosen uuid;
begin
  select count(*) into v_pool_size from words w where w.category = p_category;
  v_exclude_count := floor(v_pool_size * p_exclude_fraction);

  -- Never-used words come first, at random among themselves. This is what
  -- actually works through the whole bank: no word repeats until every
  -- other word in its category has been seen once. Treating "never used"
  -- and "used ages ago" as equally eligible (as the original design did)
  -- means a word from twenty games back competes with 800 untouched ones,
  -- so the bank is never exhausted and favourites resurface early.
  select w.id into v_chosen
  from words w
  where w.category = p_category and w.last_used_at is null
  order by random()
  limit 1;

  -- Bank exhausted: fall back to anything outside the most-recently-used
  -- slice, so the second pass through still never repeats recent words.
  if v_chosen is null then
    select w.id into v_chosen
    from words w
    where w.category = p_category
      and w.id not in (
        select w2.id
        from words w2
        where w2.category = p_category and w2.last_used_at is not null
        order by w2.last_used_at desc
        limit v_exclude_count
      )
    order by random()
    limit 1;
  end if;

  -- Safety net for a pool smaller than its own exclusion window, which
  -- would otherwise leave nothing eligible: fall back to whatever was used
  -- longest ago rather than returning an empty draw.
  if v_chosen is null then
    select w.id into v_chosen
    from words w
    where w.category = p_category
    order by w.last_used_at asc nulls first
    limit 1;
  end if;

  return query
  update words w
  set last_used_at = now()
  where w.id = v_chosen
  returning w.id, w.prompt, w.category;
end;
$$ language plpgsql volatile security definer set search_path = public;

create or replace function draw_song(p_exclude_fraction real default 0.2)
returns table (id uuid, title text, artist text) as $$
declare
  v_pool_size int;
  v_exclude_count int;
  v_chosen uuid;
begin
  select count(*) into v_pool_size from songs;
  v_exclude_count := floor(v_pool_size * p_exclude_fraction);

  -- Never-used songs first, same as words.
  select s.id into v_chosen
  from songs s
  where s.last_used_at is null
  order by random()
  limit 1;

  if v_chosen is null then
    select s.id into v_chosen
    from songs s
    where s.id not in (
      select s2.id
      from songs s2
      where s2.last_used_at is not null
      order by s2.last_used_at desc
      limit v_exclude_count
    )
    order by random()
    limit 1;
  end if;

  if v_chosen is null then
    select s.id into v_chosen
    from songs s
    order by s.last_used_at asc nulls first
    limit 1;
  end if;

  return query
  update songs s
  set last_used_at = now()
  where s.id = v_chosen
  returning s.id, s.title, s.artist;
end;
$$ language plpgsql volatile security definer set search_path = public;

grant execute on function draw_word(text, real) to anon;
grant execute on function draw_song(real) to anon;
