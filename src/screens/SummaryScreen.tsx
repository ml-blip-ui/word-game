import { useState } from 'react';
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
  // Index of the row awaiting a "really report this?" answer. Only asked
  // when raising a report — clearing one you tapped by mistake shouldn't
  // itself need confirming.
  const [confirmingIndex, setConfirmingIndex] = useState<number | null>(null);
  const pending = confirmingIndex === null ? null : turnWords[confirmingIndex];

  // A flagged word was said out loud, so it no longer counts as "got" —
  // it's called out separately.
  const flaggedCount = turnWords.filter((w) => w.flagged).length;
  const gotCount = turnWords.filter((w) => w.outcome === 'correct' && !w.flagged).length;
  const skippedCount = turnWords.filter((w) => w.outcome !== 'correct').length;

  const handleFlagPress = (i: number) => {
    if (turnWords[i].reported) onToggleReport(i);
    else setConfirmingIndex(i);
  };

  const confirmReport = () => {
    if (confirmingIndex !== null) onToggleReport(confirmingIndex);
    setConfirmingIndex(null);
  };

  return (
    <div className="screen" style={{ padding: '28px 22px', gap: 14, position: 'relative' }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase', color: team.color }}>Turn summary — {team.name}</div>

      {/* Headline tally. Counts, not points — the running points total is
          on the scoreboard; this is "how did that turn go". */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 8,
          padding: '14px 16px',
          borderRadius: '18px 14px 20px 15px',
          border: '2px solid oklch(0.3 0.03 50 / 0.3)',
          background: 'var(--surface)',
          fontFamily: 'var(--font-sans)',
          fontWeight: 600,
          fontSize: 16,
          color: 'var(--ink-muted)',
        }}
      >
        <span>You got</span>
        <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 30, lineHeight: 1, color: 'var(--cat-nature)' }}>{gotCount}</span>
        <span>and skipped</span>
        <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 30, lineHeight: 1, color: 'var(--cat-person)' }}>{skippedCount}</span>
        {flaggedCount > 0 && (
          <>
            <span>·</span>
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 30, lineHeight: 1, color: 'var(--rust)' }}>{flaggedCount}</span>
            <span>flagged</span>
          </>
        )}
      </div>

      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, color: 'var(--ink-muted)', marginTop: -4, lineHeight: 1.45 }}>
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
                onClick={() => handleFlagPress(i)}
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

      {pending && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 45,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 26,
            background: 'oklch(0.3 0.03 50 / 0.6)',
            animation: 'fade-up 0.15s ease',
          }}
          onClick={() => setConfirmingIndex(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              width: '100%',
              maxWidth: 300,
              padding: '26px 24px',
              borderRadius: '24px 18px 26px 20px',
              border: '2.2px solid var(--ink)',
              background: 'var(--bg)',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: 26, lineHeight: 1, color: 'var(--cat-person)' }}>⚑</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 16, color: 'var(--ink)', lineHeight: 1.4 }}>
              Report this as an impossible word?
            </span>
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 20, color: 'var(--ink)', overflowWrap: 'anywhere' }}>{pending.text}</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.4 }}>
              It'll be added to the list for removal. Scores aren't affected.
            </span>
            <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 2 }}>
              <button
                onClick={confirmReport}
                style={{
                  flex: 1,
                  padding: '15px 0',
                  borderRadius: '18px 13px 16px 14px',
                  border: '2.2px solid var(--ink)',
                  background: 'var(--cat-person)',
                  color: 'var(--cream)',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 800,
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                Yes, report
              </button>
              <button
                onClick={() => setConfirmingIndex(null)}
                style={{
                  flex: 1,
                  padding: '15px 0',
                  borderRadius: '13px 18px 14px 16px',
                  border: '2.2px solid var(--ink)',
                  background: 'transparent',
                  color: 'var(--ink)',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
