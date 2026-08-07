-- Groups: a persistent named roster of players (e.g. "Grups and Chiddlers"),
-- separate from a game's teams. Picking a group pre-fills its members; team
-- count and assignment are still decided fresh each game, defaulting to
-- however the group split last time. Deliberately no group-level scores —
-- kept to roster + last split only.

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text generated always as (lower(trim(name))) stored unique,
  created_at timestamptz not null default now()
);

create table group_members (
  group_id uuid not null references groups (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  member_order int not null,
  primary key (group_id, player_id)
);

-- One row per group holding its most recent team split, so the next game
-- can default to it. teams is a JSON array of arrays of player_id.
create table group_last_teams (
  group_id uuid primary key references groups (id) on delete cascade,
  team_count int not null,
  teams jsonb not null,
  updated_at timestamptz not null default now()
);

create view group_rosters as
select
  g.id,
  g.name,
  g.created_at,
  coalesce(
    jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) order by gm.member_order) filter (where p.id is not null),
    '[]'::jsonb
  ) as members
from groups g
left join group_members gm on gm.group_id = g.id
left join players p on p.id = gm.player_id
group by g.id, g.name, g.created_at
order by g.created_at desc;

alter table groups enable row level security;
alter table group_members enable row level security;
alter table group_last_teams enable row level security;

create policy "anon all groups" on groups for all using (true) with check (true);
create policy "anon all group_members" on group_members for all using (true) with check (true);
create policy "anon all group_last_teams" on group_last_teams for all using (true) with check (true);
