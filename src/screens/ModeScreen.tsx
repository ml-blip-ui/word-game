import type { Mode } from '../lib/types';

const OPTIONS: { key: Mode; label: string; desc: string }[] = [
  { key: 'practice', label: 'Single team practice', desc: 'One team against its own best' },
  { key: 'collaborative', label: 'Multi-team collaborative', desc: 'Everyone pools into one total' },
  { key: 'competitive', label: 'Multi-team competitive', desc: 'Teams against each other, with all-plays' },
];

interface ModeScreenProps {
  onSelect: (mode: Mode) => void;
  onLeaderboard: () => void;
  onBack: () => void;
  muted: boolean;
  onToggleMuted: () => void;
}

export function ModeScreen({ onSelect, onLeaderboard, onBack, muted, onToggleMuted }: ModeScreenProps) {
  return (
    <div className="screen" style={{ justifyContent: 'center', gap: 26, padding: '34px 28px' }}>
      <button onClick={onBack} style={{ alignSelf: 'flex-start', padding: 0, border: 'none', background: 'none', fontWeight: 700, fontSize: 15, color: 'var(--ink-muted)', cursor: 'pointer' }}>
        ‹ Back
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 40, lineHeight: 1.05, color: 'var(--ink)' }}>New game</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 16, color: 'var(--ink-muted)' }}>Pick how you're playing.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => onSelect(o.key)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 5,
              padding: 20,
              borderRadius: '20px 15px 22px 16px',
              border: '2.2px solid var(--ink)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 18 }}>{o.label}</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, opacity: 0.8 }}>{o.desc}</span>
          </button>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onLeaderboard}
          style={{ border: 'none', background: 'none', padding: 0, fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14, color: 'var(--ink-muted)', cursor: 'pointer' }}
        >
          All-time leaderboard ›
        </button>
        <button
          onClick={onToggleMuted}
          style={{ border: 'none', background: 'none', padding: 0, fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14, color: 'var(--ink-muted)', cursor: 'pointer' }}
        >
          Sound: {muted ? 'off' : 'on'}
        </button>
      </div>
    </div>
  );
}
