import { categoryMeta } from '../lib/categories';
import type { Team, TurnWordEntry } from '../lib/types';

interface SummaryScreenProps {
  team: Team;
  turnWords: TurnWordEntry[];
  onToggleFlag: (index: number) => void;
  onToggleReport: (index: number) => void;
  onConfirm: () => void;
}

const OUTCOME_META: Record<TurnWordEntry['outcome'], [string, string]> = {
  correct: ['Correct', 'var(--rust)'],
  skip: ['Skipped', 'var(--ink-muted)'],
  auto_skip: ['Auto-skip', 'var(--ink-muted)'],
};

export function SummaryScreen({ team, turnWords, onToggleFlag, onToggleReport, onConfirm }: SummaryScreenProps) {
  return (
    <div className="screen" style={{ padding: '28px 22px', gap: 14 }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase', color: team.color }}>Turn summary — {team.name}</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, color: 'var(--ink-muted)', marginTop: -8, lineHeight: 1.45 }}>
        Tap a word to flag a slip. Tap ⚑ to report a word as impossible.
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 9, marginTop: 4, minHeight: 0 }}>
        {turnWords.map((w, i) => {
          const [label, color] = OUTCOME_META[w.outcome];
          const flaggable = w.scoredTeamIdx !== null;
          // Only worth naming the source category on a Random turn — on a
          // Nature turn every row is Nature, and repeating it is noise.
          const showSource = w.category === 'random';
          const sourceMeta = showSource && w.sourceCategory ? categoryMeta(w.sourceCategory) : null;

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'stretch',
                gap: 0,
                // Without this, a long turn's worth of rows shrink to
                // nothing inside the scrolling flex column instead of
                // overflowing it.
                flexShrink: 0,
                borderRadius: '16px 12px 15px 13px',
                border: '2px solid oklch(0.3 0.03 50 / 0.35)',
                background: w.flagged ? 'var(--flag-bg)' : 'var(--surface)',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => flaggable && onToggleFlag(i)}
                disabled={!flaggable}
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '14px 12px 14px 16px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: flaggable ? 'pointer' : 'default',
                }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  {sourceMeta && (
                    <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: sourceMeta.color }}>
                      {sourceMeta.label}
                    </span>
                  )}
                  {showSource && !sourceMeta && (
                    <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cat-random)' }}>Song</span>
                  )}
                  <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 18, color: 'var(--ink)', textDecoration: w.flagged ? 'line-through' : 'none', overflowWrap: 'anywhere' }}>
                    {w.text}
                  </span>
                </span>
                <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 13, letterSpacing: '0.04em', color: w.flagged ? 'var(--rust)' : color, whiteSpace: 'nowrap' }}>
                  {w.flagged ? 'Flagged' : `${label}${w.doubled ? ' ×2' : ''}`}
                </span>
              </button>
              <button
                onClick={() => onToggleReport(i)}
                title={w.reported ? 'Reported as impossible — tap to undo' : 'Report this word as impossible'}
                aria-label={w.reported ? 'Undo report' : 'Report word as impossible'}
                aria-pressed={w.reported}
                style={{
                  width: 48,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  borderLeft: '2px solid oklch(0.3 0.03 50 / 0.2)',
                  background: w.reported ? 'var(--cat-person)' : 'transparent',
                  color: w.reported ? 'var(--cream)' : 'oklch(0.5 0.02 50)',
                  fontSize: 17,
                  cursor: 'pointer',
                }}
              >
                ⚑
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={onConfirm}
        style={{ marginTop: 8, padding: 20, borderRadius: '20px 15px 22px 16px', border: '2.2px solid var(--ink)', background: 'var(--ink)', color: 'var(--cream)', fontWeight: 800, fontSize: 18, cursor: 'pointer' }}
      >
        Confirm and continue
      </button>
    </div>
  );
}
