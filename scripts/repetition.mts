// Simulates the OLD and NEW draw_word logic against a 1500-word category to
// show how often a word players have already seen comes back.
//
// Both models mirror the SQL exactly:
//   OLD: find the timestamp of the Nth most-recently-used word; if fewer
//        than N have been used the query yields NULL, and a NULL threshold
//        made every word eligible.
//   NEW: exclude the N most-recently-used by rank, which is an empty set
//        when nothing has been used yet.

const POOL = 1500; // words per category
const EXCLUDE_FRACTION = 0.2;
const EXCLUDE = Math.floor(POOL * EXCLUDE_FRACTION); // 300

// A 15-minute game gets through roughly 100 words across six categories,
// so about 17 land in any one category.
const WORDS_PER_CATEGORY_PER_GAME = 17;
const GAMES = 40;

interface Word {
  id: number;
  lastUsedAt: number | null;
}

function freshPool(): Word[] {
  return Array.from({ length: POOL }, (_, id) => ({ id, lastUsedAt: null }));
}

function drawOld(pool: Word[], clock: number): Word {
  const used = pool.filter((w) => w.lastUsedAt !== null).sort((a, b) => b.lastUsedAt! - a.lastUsedAt!);
  // offset EXCLUDE-1 limit 1 — undefined (i.e. SQL NULL) when too few used
  const threshold = used[EXCLUDE - 1]?.lastUsedAt ?? null;
  const eligible = pool.filter((w) => w.lastUsedAt === null || threshold === null || w.lastUsedAt < threshold);
  const chosen = eligible[Math.floor(Math.random() * eligible.length)];
  chosen.lastUsedAt = clock;
  return chosen;
}

function drawNew(pool: Word[], clock: number): Word {
  // Never-used words first.
  const unused = pool.filter((w) => w.lastUsedAt === null);
  let chosen: Word;
  if (unused.length > 0) {
    chosen = unused[Math.floor(Math.random() * unused.length)];
  } else {
    const recent = new Set(
      pool
        .filter((w) => w.lastUsedAt !== null)
        .sort((a, b) => b.lastUsedAt! - a.lastUsedAt!)
        .slice(0, EXCLUDE)
        .map((w) => w.id),
    );
    const eligible = pool.filter((w) => !recent.has(w.id));
    chosen =
      eligible.length > 0
        ? eligible[Math.floor(Math.random() * eligible.length)]
        : pool.slice().sort((a, b) => (a.lastUsedAt ?? -1) - (b.lastUsedAt ?? -1))[0];
  }
  chosen.lastUsedAt = clock;
  return chosen;
}

function run(draw: (pool: Word[], clock: number) => Word, label: string) {
  const pool = freshPool();
  let clock = 0;
  const seenCount = new Map<number, number>();
  let repeatsWithinGame = 0;
  let firstRepeatGame: number | null = null;
  let totalRepeats = 0;
  const distinctByGame: number[] = [];

  for (let game = 1; game <= GAMES; game++) {
    const thisGame = new Set<number>();
    for (let i = 0; i < WORDS_PER_CATEGORY_PER_GAME; i++) {
      const w = draw(pool, clock++);
      if (thisGame.has(w.id)) repeatsWithinGame++;
      thisGame.add(w.id);
      const prev = seenCount.get(w.id) ?? 0;
      if (prev > 0) {
        totalRepeats++;
        if (firstRepeatGame === null) firstRepeatGame = game;
      }
      seenCount.set(w.id, prev + 1);
    }
    distinctByGame.push(seenCount.size);
  }

  const totalDrawn = GAMES * WORDS_PER_CATEGORY_PER_GAME;
  const distinct = seenCount.size;
  const seenTwicePlus = [...seenCount.values()].filter((c) => c >= 2).length;
  const worst = Math.max(...seenCount.values());

  console.log(`\n=== ${label} ===`);
  console.log(`  ${GAMES} games x ${WORDS_PER_CATEGORY_PER_GAME} words = ${totalDrawn} draws from a ${POOL}-word category`);
  console.log(`  distinct words seen:        ${distinct} of ${totalDrawn} drawn`);
  console.log(`  words seen more than once:  ${seenTwicePlus}`);
  console.log(`  most times one word came up: ${worst}`);
  console.log(`  repeat draws overall:       ${totalRepeats} (${((totalRepeats / totalDrawn) * 100).toFixed(1)}%)`);
  console.log(`  repeats inside a single game: ${repeatsWithinGame}`);
  console.log(`  first repeat appeared in game: ${firstRepeatGame ?? 'never'}`);
  console.log(`  pool coverage after ${GAMES} games: ${((distinct / POOL) * 100).toFixed(1)}%`);
}

// Average across many trials for the headline numbers.
function averageRepeatRate(draw: (pool: Word[], clock: number) => Word, trials = 200): number {
  let sum = 0;
  for (let t = 0; t < trials; t++) {
    const pool = freshPool();
    let clock = 0;
    const seen = new Set<number>();
    let repeats = 0;
    for (let i = 0; i < GAMES * WORDS_PER_CATEGORY_PER_GAME; i++) {
      const w = draw(pool, clock++);
      if (seen.has(w.id)) repeats++;
      seen.add(w.id);
    }
    sum += repeats / (GAMES * WORDS_PER_CATEGORY_PER_GAME);
  }
  return (sum / trials) * 100;
}

run(drawOld, 'OLD (shipped) — threshold went NULL, so no protection');
run(drawNew, 'NEW — never-used words first, then recency-excluded');

console.log('\n=== Averaged over 200 trials ===');
console.log(`  OLD repeat rate: ${averageRepeatRate(drawOld).toFixed(2)}% of draws were words already seen`);
console.log(`  NEW repeat rate: ${averageRepeatRate(drawNew).toFixed(2)}%`);

// How long until the bank is genuinely exhausted and repeats must begin?
{
  const pool = freshPool();
  let clock = 0;
  const seen = new Set<number>();
  let draws = 0;
  let firstRepeatDraw: number | null = null;
  while (draws < POOL * 2) {
    const w = drawNew(pool, clock++);
    draws++;
    if (seen.has(w.id) && firstRepeatDraw === null) firstRepeatDraw = draws;
    seen.add(w.id);
    if (firstRepeatDraw !== null) break;
  }
  console.log('\n=== When does the first repeat become unavoidable? ===');
  console.log(`  first repeated word on draw ${firstRepeatDraw} of a ${POOL}-word category`);
  console.log(`  = roughly game ${Math.round((firstRepeatDraw ?? 0) / WORDS_PER_CATEGORY_PER_GAME)} at ${WORDS_PER_CATEGORY_PER_GAME} words per category per game`);
}
