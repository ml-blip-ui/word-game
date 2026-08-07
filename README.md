# Word Guessing Game

A party word-guessing game in the mould of Articulate, played on one phone
passed between players. Mobile web app: React + TypeScript + Vite on the
front end, Supabase for the word bank and persistence, deployed to Netlify.

See the two specs this was built from for gameplay rules and visual design
intent — they're the source of truth for *why* things work the way they do.

## Setup

### 1. Supabase project

1. Create a new project in the Supabase dashboard.
2. Open **SQL Editor** and run, in order:
   - `supabase/migrations/0001_init.sql` — tables, RPC functions, RLS policies, the stats view.
   - `supabase/migrations/0002_groups.sql` — groups (persistent named rosters, e.g. "Grups and Chiddlers").
   - `supabase/migrations/0003_fix_draw_word.sql`, `0004_security_definer_draws.sql`, `0005_word_reports.sql` — fixes and the reported-words table.
   - `supabase/seed/seed_data.sql` — loads the ~7,500 words and 800 songs.
3. Under **Project Settings → API**, copy the **Project URL** and **anon / publishable** key.

### 2. Environment variables

```
cp .env.example .env.local
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from step 1. The anon
key is safe to ship client-side by design — it's constrained by the RLS
policies in the migration, not by secrecy.

`VITE_APP_PASSWORD` (default `wordz`) gates the app past the title screen.
This is a soft deterrent against casual sharing — the word bank isn't ours to
redistribute — not real security: it ships in the client bundle like any
other Vite env var, and the check happens entirely client-side.

### 3. Run it

```
npm install
npm run dev
```

### 4. Deploy to Netlify

`netlify.toml` is already set up (`npm run build`, publishes `dist/`, SPA
redirect). In Netlify: **Add new site → Import an existing project**, point
it at this repo/branch, and add the same three env vars (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_APP_PASSWORD`) under **Site settings →
Environment variables**.

## Groups

A group is a persistent named roster (e.g. "Grups and Chiddlers") — separate
from a game's teams. Picking a group at setup fills in all its members; team
count and who's on which team are still decided fresh each game (drag the
⠿ handle on a player pill to move them to another team), defaulting to
however the group split last time. Deliberately no group-level scoreboard —
kept to roster + last split only, to avoid turning a holiday game into a
running competition.

## Curating the word bank

The turn summary has a ⚑ button on every word. That reports the word as
impossible or too obscure — deliberately separate from tapping the row
itself, which flags a *slip* (someone said the word) and reverses the
point. Reporting has no effect on scoring.

To review what's been reported, run this in the Supabase SQL Editor:

```sql
select * from reported_words;
```

Worst offenders come first. To retire one:

```sql
delete from words where id = '<target_id>';
```

## Notes on categories

The word data uses five categories — **Object, Nature, Person, Action,
World** — plus **Random**, which draws from those five pools and the Song
pool. This supersedes the original seven-category gameplay spec (which had
"World of Sport" and "Entertainment"); the actual word bank only covers
these five plus songs.

## Where design decisions were made without an explicit spec answer

A few things the specs and design handoff left open were resolved with a
judgment call rather than a hard requirement — noted in code comments at
each site:

- **Random category weighting** (`src/lib/categories.ts`): each turn-word in
  a Random turn is drawn from one of 6 equally-weighted buckets (5 word
  categories + songs), so roughly 1 in 6 words is a song. Not specified in
  the gameplay spec.
- **All-play placement** (`src/lib/allplay.ts`): since a turn's word count
  isn't known in advance (turns are time-boxed, not word-count-boxed),
  "middle third, never first, never last" is implemented against elapsed
  turn-time fractions rather than word index.
- **Repetition protection fraction** (`supabase/migrations/0001_init.sql`):
  the gameplay spec's numbers (exclude the last 1,500 of ~7,500 words) are a
  20% exclusion fraction; the `draw_word`/`draw_song` functions use that
  fraction generically so it scales correctly to the much smaller song pool
  instead of hard-coding 1,500.
- **Sound**: still synthesised placeholder tones (as in the design handoff
  prototype), not real physical-sounding samples — no audio assets were
  provided. A mute toggle lives on the mode-select screen.

## What's deliberately not built

- Song pool decade-tagging (gameplay spec §14, explicitly deferred).
- Difficulty-based word selection — the `difficulty` column exists in the
  schema per §14 but nothing writes or reads it yet; it's there so unfair
  words can be curated later without a schema change.
