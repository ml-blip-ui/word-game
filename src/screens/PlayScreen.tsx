import { categoryMeta, type CategoryKey } from '../lib/categories';
import type { DrawnWord } from '../lib/types';
import { WordTimerRing } from '../components/WordTimerRing';
import { TurnTimerBar, formatClock } from '../components/TurnTimerBar';
import { fitSize } from '../lib/wordSize';

interface PlayScreenProps {
  categoryKey: CategoryKey;
  word: DrawnWord | null;
  turnTimeLeft: number;
  turnSeconds: number;
  wordTimeLeft: number;
  wordTimeLimit: number;
  turnScore: number;
  doubled: boolean;
  onGotIt: () => void;
  onSkip: () => void;
}

export function PlayScreen({ categoryKey, word, turnTimeLeft, turnSeconds, wordTimeLeft, wordTimeLimit, turnScore, doubled, onGotIt, onSkip }: PlayScreenProps) {
  const cat = categoryMeta(categoryKey);
  const text = word?.kind === 'word' ? word.text : '';

  // On a Random turn each word still comes from a real category, so the
  // word itself takes that category's colour and names it. The turn-level
  // chrome (label, ring, button) stays Random-slate so the screen doesn't
  // restyle itself every few seconds.
  const source = categoryKey === 'random' && word?.kind === 'word' ? categoryMeta(word.category) : null;
  const wordColor = source ? source.color : cat.color;

  return (
    <div className="screen" style={{ position: 'relative', padding: '22px 26px 30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase', color: cat.color }}>{cat.label.toUpperCase()}</span>
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, color: 'var(--ink-muted)', fontVariantNumeric: 'tabular-nums' }}>{formatClock(turnTimeLeft)} left</span>
      </div>
      <TurnTimerBar pct={(turnTimeLeft / turnSeconds) * 100} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, width: '100%' }}>
        <WordTimerRing timeLeft={wordTimeLeft} timeLimit={wordTimeLimit} strokeColor={cat.color} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
          {source && (
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: source.color }}>
              {source.label}
            </span>
          )}
          <div
            style={{
              width: '100%',
              fontFamily: 'var(--font-serif)',
              fontWeight: 700,
              fontSize: fitSize(text, 58),
              lineHeight: 1.08,
              textAlign: 'center',
              textWrap: 'balance',
              overflowWrap: 'normal',
              color: wordColor,
            }}
          >
            {text}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14, width: '100%' }}>
        <button onClick={onGotIt} style={{ flex: 1, padding: '26px 0', borderRadius: '22px 16px 20px 15px', border: '2.2px solid var(--ink)', background: cat.color, color: 'var(--cream)', fontWeight: 800, fontSize: 20, cursor: 'pointer' }}>
          Got it
        </button>
        <button onClick={onSkip} style={{ flex: 1, padding: '26px 0', borderRadius: '16px 22px 15px 20px', border: '2.2px solid var(--ink)', background: 'transparent', color: 'var(--ink)', fontWeight: 700, fontSize: 19, cursor: 'pointer' }}>
          Skip
        </button>
      </div>
      <div style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 15, color: 'var(--ink-muted)', marginTop: 14 }}>
        Turn score {turnScore >= 0 ? `+${turnScore}` : turnScore}
        {doubled ? '  ·  token in play ×2' : ''}
      </div>
    </div>
  );
}
