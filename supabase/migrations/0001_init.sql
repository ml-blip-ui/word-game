-- Word Guessing Game — initial schema
-- Personal project, single shared device, no accounts. RLS is enabled with
-- permissive policies (anon key can read/write) rather than disabled outright,
-- so it's cheap to tighten later if this ever leaves personal use.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Word bank
-- ---------------------------------------------------------------------------

create table words (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('object', 'nature', 'person', 'action', 'world')),
  prompt text not null,
  difficulty smallint, -- 1 (easy) - 5 (hard); nullable, unrated words are fine to draw
  last_used_at timestamptz
);

create index words_category_last_used_idx on words (category, last_used_at);

create table songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  difficulty smallint,
  last_used_at timestamptz
);

create index songs_last_used_idx on songs (last_used_at);

-- ---------------------------------------------------------------------------
-- Repetition protection (spec §12)
--
-- Draw at random from words where last_used_at is null or old enough that
-- it falls outside the most-recently-used slice of the pool. The slice size
-- is a fraction of the pool (not a hardcoded 1500) so the same function works
-- for the ~1500-word category pools and the much smaller song pool alike —
-- the gameplay spec's own numbers (1500 excluded of 7500 words) are a 20%
-- slice, so 20% is the default fraction here.
-- ---------------------------------------------------------------------------

create or replace function draw_word(p_category text, p_exclude_fraction real default 0.2)
returns table (id uuid, prompt text, category text) as $$
declare
  v_pool_size int;
  v_exclude_count int;
  v_threshold timestamptz;
begin
  select count(*) into v_pool_size from words where category = p_category;
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
$$ language plpgsql volatile;

-- ---------------------------------------------------------------------------
-- Players and persistence (spec §11)
-- ---------------------------------------------------------------------------

create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text generated always as (lower(trim(name))) stored unique,
  created_at timestamptz not null default now()
);

create table games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  mode text not null check (mode in ('practice', 'collaborative', 'competitive')),
  turn_seconds int not null check (turn_seconds in (60, 90, 120)),
  win_type text not null check (win_type in ('time', 'points', 'rounds')),
  win_value int not null,
  finished boolean not null default false
);

create table game_teams (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  team_index int not null,
  name text not null,
  color text not null,
  total_tokens int not null,
  final_score int not null default 0
);

create table game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  game_team_id uuid not null references game_teams (id) on delete cascade,
  player_id uuid not null references players (id),
  player_order int not null
);

create table turn_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  describing_team_id uuid not null references game_teams (id),
  describing_player_id uuid not null references players (id),
  turn_index int not null,
  category text not null,
  word_id uuid references words (id),
  song_id uuid references songs (id),
  outcome text not null check (outcome in ('correct', 'skip', 'auto_skip')),
  doubled boolean not null default false,
  is_allplay boolean not null default false,
  scored_team_id uuid references game_teams (id), -- the team that actually took the point (steal target on all-play)
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);

create index turn_events_game_idx on turn_events (game_id);
create index turn_events_scored_team_idx on turn_events (scored_team_id);
create index turn_events_player_idx on turn_events (describing_player_id);

create table best_scores (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('practice', 'collaborative')),
  turn_seconds int not null,
  win_type text not null,
  win_value int not null,
  score int not null,
  game_id uuid references games (id) on delete set null,
  achieved_at timestamptz not null default now()
);

create unique index best_scores_settings_idx on best_scores (mode, turn_seconds, win_type, win_value);

-- ---------------------------------------------------------------------------
-- Lifetime player stats — derived from turn_events, not incrementally
-- maintained, so it can never drift out of sync with the event log.
-- ---------------------------------------------------------------------------

-- A flagged correct word reverses its point (+1 -> -1, so -2 * mult under a
-- token) and additionally the flag itself carries no separate line item —
-- the reversal already nets out to -1 * mult, matching "a slip that scored
-- goes from +1 to -1" in the gameplay spec.
create view player_category_points as
select
  te.describing_player_id as player_id,
  te.category,
  sum(
    case
      when te.flagged then -1 * (case when te.doubled then 2 else 1 end)
      when te.outcome = 'correct' then 1 * (case when te.doubled then 2 else 1 end)
      else -1 * (case when te.doubled then 2 else 1 end)
    end
  ) as points
from turn_events te
group by te.describing_player_id, te.category;

create view player_lifetime_stats as
select
  p.id as player_id,
  p.name,
  count(te.id) filter (where te.outcome = 'correct') as correct_count,
  count(te.id) filter (where te.outcome in ('skip', 'auto_skip')) as skip_count,
  count(te.id) filter (where te.flagged) as flag_count,
  count(te.id) filter (where te.is_allplay and te.outcome = 'correct' and te.scored_team_id <> te.describing_team_id) as allplay_steals,
  coalesce(sum(
    case
      when te.flagged then -1 * (case when te.doubled then 2 else 1 end)
      when te.outcome = 'correct' then 1 * (case when te.doubled then 2 else 1 end)
      else -1 * (case when te.doubled then 2 else 1 end)
    end
  ), 0) as total_points,
  count(distinct te.game_id) as games_played,
  (
    select coalesce(jsonb_object_agg(pcp.category, pcp.points), '{}'::jsonb)
    from player_category_points pcp
    where pcp.player_id = p.id
  ) as points_by_category
from players p
left join turn_events te on te.describing_player_id = p.id
group by p.id, p.name;

-- ---------------------------------------------------------------------------
-- RLS — permissive policies for the anon key. Single shared device, no
-- accounts; the point of RLS here is "easy to tighten later", not to guard
-- against anything today.
-- ---------------------------------------------------------------------------

alter table words enable row level security;
alter table songs enable row level security;
alter table players enable row level security;
alter table games enable row level security;
alter table game_teams enable row level security;
alter table game_players enable row level security;
alter table turn_events enable row level security;
alter table best_scores enable row level security;

create policy "anon read words" on words for select using (true);
create policy "anon read songs" on songs for select using (true);

create policy "anon all players" on players for all using (true) with check (true);
create policy "anon all games" on games for all using (true) with check (true);
create policy "anon all game_teams" on game_teams for all using (true) with check (true);
create policy "anon all game_players" on game_players for all using (true) with check (true);
create policy "anon all turn_events" on turn_events for all using (true) with check (true);
create policy "anon all best_scores" on best_scores for all using (true) with check (true);

grant execute on function draw_word(text, real) to anon;
grant execute on function draw_song(real) to anon;
