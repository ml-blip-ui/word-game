-- "This word is impossible / too obscure" reports, raised from the turn
-- summary screen. Deliberately separate from turn_events.flagged, which
-- means something entirely different (a player said the word out loud and
-- the point is reversed). A report has no effect on scoring at all — it
-- just records that the room thought the word was unfair, so the pool can
-- be curated later.

create table word_reports (
  id uuid primary key default gen_random_uuid(),
  word_id uuid references words (id) on delete cascade,
  song_id uuid references songs (id) on delete cascade,
  game_id uuid references games (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint word_reports_target check (num_nonnulls(word_id, song_id) = 1)
);

create index word_reports_word_idx on word_reports (word_id);
create index word_reports_song_idx on word_reports (song_id);

-- Review queue: the obscure-word cleanup list, worst offenders first.
--   select * from reported_words;
create view reported_words as
select
  'word' as kind,
  w.id as target_id,
  w.prompt as text,
  w.category,
  w.difficulty,
  count(r.id) as report_count,
  max(r.created_at) as last_reported_at
from word_reports r
join words w on w.id = r.word_id
group by w.id, w.prompt, w.category, w.difficulty
union all
select
  'song' as kind,
  s.id as target_id,
  s.title || ' — ' || s.artist as text,
  null as category,
  s.difficulty,
  count(r.id) as report_count,
  max(r.created_at) as last_reported_at
from word_reports r
join songs s on s.id = r.song_id
group by s.id, s.title, s.artist, s.difficulty
order by report_count desc, last_reported_at desc;

alter table word_reports enable row level security;
create policy "anon all word_reports" on word_reports for all using (true) with check (true);
