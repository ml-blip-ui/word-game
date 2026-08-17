import { planSpin, segmentUnderPointer } from '../src/lib/wheel.ts';

const LABELS = ['World', 'Object', 'Nature', 'Person', 'Action', 'Random'];
const N = 6;

function chiSquare(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  const exp = total / counts.length;
  return counts.reduce((acc, c) => acc + ((c - exp) ** 2) / exp, 0);
}

function report(title: string, chosen: number[], seen: number[], mismatches: number, spins: number) {
  console.log(`\n=== ${title} ===`);
  console.log('           chosen by game     seen by player');
  for (let i = 0; i < N; i++) {
    const cPct = ((chosen[i] / spins) * 100).toFixed(2);
    const sPct = ((seen[i] / spins) * 100).toFixed(2);
    console.log(`  ${LABELS[i].padEnd(8)} ${String(chosen[i]).padStart(7)} (${cPct}%)   ${String(seen[i]).padStart(7)} (${sPct}%)`);
  }
  console.log(`  chi-square (chosen), 5 df: ${chiSquare(chosen).toFixed(2)}  [11.07 = p0.05, 15.09 = p0.01]`);
  console.log(`  chi-square (seen),   5 df: ${chiSquare(seen).toFixed(2)}`);
  console.log(`  pointer/game DISAGREEMENTS: ${mismatches} of ${spins} (${((mismatches / spins) * 100).toFixed(2)}%)`);
}

// ---------------------------------------------------------------------------
// 1. Current implementation, simulating a long session: the disc's resting
//    angle carries over between turns exactly as nextTurn preserves it.
// ---------------------------------------------------------------------------
{
  const spins = 300_000;
  const chosen = new Array(N).fill(0);
  const seen = new Array(N).fill(0);
  let mismatches = 0;
  let rotation = 0;

  for (let i = 0; i < spins; i++) {
    const { idx, targetDeg } = planSpin(rotation, N);
    const visible = segmentUnderPointer(targetDeg, N);
    chosen[idx]++;
    seen[visible]++;
    if (visible !== idx) mismatches++;
    rotation = targetDeg % 360; // what nextTurn keeps
  }
  report('CURRENT implementation (300k spins, rotation carried over)', chosen, seen, mismatches, spins);
}

// ---------------------------------------------------------------------------
// 2. The OLD formula, to quantify what was on screen before the fix.
// ---------------------------------------------------------------------------
{
  const spins = 300_000;
  const chosen = new Array(N).fill(0);
  const seen = new Array(N).fill(0);
  let mismatches = 0;
  let rotation = 0;
  const seg = 360 / N;

  for (let i = 0; i < spins; i++) {
    const idx = Math.floor(Math.random() * N);
    const jitter = (Math.random() - 0.5) * (seg * 0.5);
    const targetDeg = rotation + 5 * 360 + (360 - idx * seg) + jitter; // old, buggy
    const visible = segmentUnderPointer(targetDeg, N);
    chosen[idx]++;
    seen[visible]++;
    if (visible !== idx) mismatches++;
    rotation = targetDeg % 360;
  }
  report('OLD buggy formula (300k spins) — what you were seeing', chosen, seen, mismatches, spins);
}

// ---------------------------------------------------------------------------
// 3. Boundary safety: how close does the pointer ever get to a segment edge?
// ---------------------------------------------------------------------------
{
  let worst = Infinity;
  let rotation = 0;
  for (let i = 0; i < 200_000; i++) {
    const { idx, targetDeg } = planSpin(rotation, N);
    const seg = 360 / N;
    // Angular distance from the pointer to the chosen segment's centre.
    const centreOffset = Math.abs(((((-targetDeg - idx * seg) % 360) + 540) % 360) - 180);
    const marginToEdge = seg / 2 - Math.abs(180 - centreOffset === 0 ? 0 : centreOffset > 180 ? 360 - centreOffset : centreOffset);
    worst = Math.min(worst, marginToEdge);
    rotation = targetDeg % 360;
  }
  console.log(`\n=== Boundary safety (200k spins) ===`);
  console.log(`  smallest margin from pointer to a segment edge: ${worst.toFixed(2)}°  (segment half-width is 30°)`);
}

// ---------------------------------------------------------------------------
// 4. Streak analysis on the real distribution — how often does a run of the
//    same category, or a 2-category cluster, occur in a short session? This
//    is what "it feels biased" usually is.
// ---------------------------------------------------------------------------
{
  const sessions = 200_000;
  const spinsPerSession = 12; // a decent evening's worth of turns
  let sessionsWhereTwoCatsDominate = 0;
  let sessionsWithTriple = 0;

  for (let s = 0; s < sessions; s++) {
    const counts = new Array(N).fill(0);
    let rotation = 0;
    let maxRun = 0;
    let run = 0;
    let prev = -1;
    for (let i = 0; i < spinsPerSession; i++) {
      const { idx, targetDeg } = planSpin(rotation, N);
      counts[idx]++;
      run = idx === prev ? run + 1 : 1;
      maxRun = Math.max(maxRun, run);
      prev = idx;
      rotation = targetDeg % 360;
    }
    const sorted = [...counts].sort((a, b) => b - a);
    // "Two categories accounted for at least half the spins"
    if (sorted[0] + sorted[1] >= Math.ceil(spinsPerSession / 2)) sessionsWhereTwoCatsDominate++;
    if (maxRun >= 3) sessionsWithTriple++;
  }
  console.log(`\n=== Perception check: ${spinsPerSession} spins per session, ${sessions} sessions ===`);
  console.log(`  sessions where 2 categories took >= half the spins: ${((sessionsWhereTwoCatsDominate / sessions) * 100).toFixed(1)}%`);
  console.log(`  sessions containing a run of 3+ of the same category: ${((sessionsWithTriple / sessions) * 100).toFixed(1)}%`);
}
