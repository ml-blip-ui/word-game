-- Fixes draw_word: the pool-size query referenced the "category" column
-- without qualifying which table it came from. Since the function's own
-- return type also has a column called "category", Postgres can't tell
-- them apart and raises "column reference \"category\" is ambiguous" on
-- every call — every word draw was failing silently. Safe to re-run.

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
$$ language plpgsql volatile;

grant execute on function draw_word(text, real) to anon;
