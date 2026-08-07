import type { Mode, WinType } from '../lib/types';

interface WinConditionScreenProps {
  mode: Mode | null;
  teamCount: number;
  turnSeconds: number;
  winType: WinType;
  winValue: number;
  loading: boolean;
  onBack: () => void;
  onSetWinType: (t: WinType) => void;
  onSetWinValue: (v: number) => void;
  onStart: () => void;
}

const WIN_TYPES: { key: WinType; label: string }[] = [
  { key: 'time', label: 'Time limit' },
  { key: 'points', label: 'Points target' },
  { key: 'rounds', label: 'Round count' },
];

export function WinConditionScreen({ mode, teamCount, turnSeconds, winType, winValue, loading, onBack, onSetWinType, onSetWinValue, onStart }: WinConditionScreenProps) {
  const isPractice = mode === 'practice';
  const values = winType === 'time' ? [10, 15, 20, 25] : winType === 'points' ? [20, 30, 40, 50] : [teamCount * 2, teamCount * 4, teamCount * 6, teamCount * 8];
  const valueLabel = winType === 'time' ? 'Minutes' : winType === 'points' ? 'Points to win' : 'Rounds';
  const summary = winType === 'time' ? `${winValue} minutes` : winType === 'points' ? `first to ${winValue}` : `${winValue} rounds`;

  return (
    <div className="screen" style={{ gap: 18, padding: '30px 26px' }}>
      <button onClick={onBack} style={{ alignSelf: 'flex-start', padding: 0, border: 'none', background: 'none', fontWeight: 700, fontSize: 15, color: 'var(--ink-muted)', cursor: 'pointer' }}>
        ‹ Back
      </button>
      <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 32, color: 'var(--ink)' }}>Win condition</div>

      {!isPractice && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {WIN_TYPES.map((w) => (
            <button
              key={w.key}
              onClick={() => onSetWinType(w.key)}
              style={{
                padding: 18,
                borderRadius: '18px 14px 20px 15px',
                border: '2.2px solid var(--ink)',
                background: winType === w.key ? 'var(--ink)' : 'var(--surface)',
                color: winType === w.key ? 'var(--cream)' : 'var(--ink)',
                fontWeight: 800,
                fontSize: 17,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              {w.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>{valueLabel}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {values.map((v) => (
            <button
              key={v}
              onClick={() => onSetWinValue(v)}
              style={{
                flex: 1,
                minWidth: 70,
                padding: '16px 0',
                borderRadius: '15px 12px 16px 13px',
                border: '2.2px solid var(--ink)',
                background: winValue === v ? 'var(--ink)' : 'var(--surface)',
                color: winValue === v ? 'var(--cream)' : 'var(--ink)',
                fontWeight: 800,
                fontSize: 18,
                cursor: 'pointer',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, color: 'var(--ink-muted)' }}>
        {isPractice ? '1 team' : `${teamCount} teams`} · {turnSeconds}s turns · {summary}
      </div>
      <button
        onClick={onStart}
        disabled={loading}
        style={{
          padding: 20,
          borderRadius: '20px 15px 22px 16px',
          border: '2.2px solid var(--ink)',
          background: 'var(--rust)',
          color: 'var(--cream)',
          fontWeight: 800,
          fontSize: 19,
          cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Starting…' : 'Start game'}
      </button>
    </div>
  );
}
