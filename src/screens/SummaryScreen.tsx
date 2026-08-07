import type { Team, TurnWordEntry } from '../lib/types';

interface SummaryScreenProps {
  team: Team;
  turnWords: TurnWordEntry[];
  onToggleFlag: (index: number) => void;
  onConfirm: () => void;
}

const OUTCOME_META: Record<TurnWordEntry['outcome'], [string, string]> = {
  correct: ['Correct', 'var(--rust)'],
  skip: ['Skipped', 'var(--ink-muted)'],
  auto_skip: ['Auto-skip', 'var(--ink-muted)'],
};

export function SummaryScreen({ team, turnWords, onToggleFlag, onConfirm }: SummaryScreenProps) {
  return (
    <div className="screen" style={{ padding: '28px 22px', gap: 14 }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase', color: team.color }}>Turn summary — {team.name}</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 15, color: 'var(--ink-muted)', marginTop: -8 }}>Tap a word to flag a slip.</div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 9, marginTop: 4, minHeight: 0 }}>
        {turnWords.map((w, i) => {
          const [label, color] = OUTCOME_META[w.outcome];
          const flaggable = w.scoredTeamIdx !== null;
          return (
            <button
              key={i}
              onClick={() => flaggable && onToggleFlag(i)}
              disabled={!flaggable}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '14px 16px',
                borderRadius: '16px 12px 15px 13px',
                border: '2px solid oklch(0.3 0.03 50 / 0.35)',
                background: w.flagged ? 'var(--flag-bg)' : 'var(--surface)',
                textAlign: 'left',
                cursor: flaggable ? 'pointer' : 'default',
              }}
            >
              <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 18, color: 'var(--ink)', textDecoration: w.flagged ? 'line-through' : 'none' }}>{w.text}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 13, letterSpacing: '0.04em', color: w.flagged ? 'var(--rust)' : color, whiteSpace: 'nowrap' }}>
                {w.flagged ? 'Flagged' : `${label}${w.doubled ? ' ×2' : ''}`}
              </span>
            </button>
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
