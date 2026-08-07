import { categoryMeta, type CategoryKey } from '../lib/categories';
import type { DrawnWord } from '../lib/types';
import { formatClock } from '../components/TurnTimerBar';
import { fitSize } from '../lib/wordSize';

interface SongScreenProps {
  categoryKey: CategoryKey;
  word: DrawnWord | null;
  turnTimeLeft: number;
  onGotIt: () => void;
  onSkip: () => void;
}

export function SongScreen({ categoryKey, word, turnTimeLeft, onGotIt, onSkip }: SongScreenProps) {
  const cat = categoryMeta(categoryKey);
  const title = word?.kind === 'song' ? word.title : '';
  const artist = word?.kind === 'song' ? word.artist : '';

  return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', gap: 20, padding: 30, textAlign: 'center', background: 'var(--surface-deep)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 18px', borderRadius: 999, border: '2px solid var(--ink)' }}>
        <svg width={14} height={16} viewBox="0 0 24 24">
          <rect x={5} y={3} width={5} height={18} fill="var(--ink)" />
          <rect x={14} y={3} width={5} height={18} fill="var(--ink)" />
        </svg>
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink)' }}>
          Clock paused — {formatClock(turnTimeLeft)} held
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 14, letterSpacing: '0.16em', textTransform: 'uppercase', color: cat.color }}>Song</div>
      <div style={{ width: '100%', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: fitSize(title, 50), lineHeight: 1.1, overflowWrap: 'normal', color: cat.color }}>{title}</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 19, color: 'oklch(0.36 0.02 50)' }}>{artist}</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, color: 'var(--ink-muted)', maxWidth: 250 }}>Title and artist both needed.</div>
      <div style={{ display: 'flex', gap: 14, width: '100%', marginTop: 14 }}>
        <button onClick={onGotIt} style={{ flex: 1, padding: '26px 0', borderRadius: '22px 16px 20px 15px', border: '2.2px solid var(--ink)', background: cat.color, color: 'var(--cream)', fontWeight: 800, fontSize: 20, cursor: 'pointer' }}>
          Got it
        </button>
        <button onClick={onSkip} style={{ flex: 1, padding: '26px 0', borderRadius: '16px 22px 15px 20px', border: '2.2px solid var(--ink)', background: 'transparent', color: 'var(--ink)', fontWeight: 700, fontSize: 19, cursor: 'pointer' }}>
          Skip
        </button>
      </div>
    </div>
  );
}
