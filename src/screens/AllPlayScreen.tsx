import { categoryMeta, type CategoryKey } from '../lib/categories';
import type { DrawnWord, Team } from '../lib/types';
import { WordTimerRing } from '../components/WordTimerRing';
import { TurnTimerBar, formatClock } from '../components/TurnTimerBar';
import { fitSize } from '../lib/wordSize';

interface AllPlayScreenProps {
  categoryKey: CategoryKey;
  word: DrawnWord | null;
  turnTimeLeft: number;
  turnSeconds: number;
  wordTimeLeft: number;
  wordTimeLimit: number;
  teams: Team[];
  onCorrect: (teamIdx: number) => void;
  onSkip: () => void;
}

export function AllPlayScreen({ categoryKey, word, turnTimeLeft, turnSeconds, wordTimeLeft, wordTimeLimit, teams, onCorrect, onSkip }: AllPlayScreenProps) {
  const cat = categoryMeta(categoryKey);
  const text = word?.kind === 'word' ? word.text : '';
  // The all-play card is a full bleed of the category colour, so the word
  // stays cream here — a sage or ochre word on a slate card would be
  // muddy. On a Random turn the source category is named instead.
  const source = categoryKey === 'random' && word?.kind === 'word' ? categoryMeta(word.category) : null;

  return (
    <div className="screen" style={{ padding: '22px 24px 28px', background: cat.color, textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 14, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--cream-bright)' }}>All play</span>
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, color: 'oklch(0.99 0.01 80 / 0.8)', fontVariantNumeric: 'tabular-nums' }}>{formatClock(turnTimeLeft)} left</span>
      </div>
      <TurnTimerBar pct={(turnTimeLeft / turnSeconds) * 100} fillColor="oklch(0.99 0.01 80 / 0.75)" trackColor="oklch(0.28 0.03 50 / 0.25)" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, width: '100%' }}>
        <WordTimerRing timeLeft={wordTimeLeft} timeLimit={wordTimeLimit} size={72} strokeColor="var(--cream-bright)" trackColor="oklch(0.28 0.03 50 / 0.25)" textColor="var(--cream-bright)" />
        {source && (
          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.99 0.01 80 / 0.8)', marginBottom: -8 }}>
            {source.label}
          </span>
        )}
        <div style={{ width: '100%', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: fitSize(text, 58), lineHeight: 1.08, textWrap: 'balance', overflowWrap: 'normal', color: 'var(--cream-bright)' }}>
          {text}
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14, color: 'oklch(0.99 0.01 80 / 0.85)' }}>Anyone can guess — tap the team that got it</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, width: '100%' }}>
        {teams.map((t, i) => (
          <button
            key={t.gameTeamId}
            onClick={() => onCorrect(i)}
            style={{ padding: '22px 0', borderRadius: '20px 15px 22px 16px', border: '2.2px solid var(--ink)', background: t.color, color: 'var(--cream)', fontWeight: 800, fontSize: 18, cursor: 'pointer' }}
          >
            Correct — {t.name}
          </button>
        ))}
        <button onClick={onSkip} style={{ padding: '16px 0', borderRadius: '15px 20px 16px 22px', border: '2px solid oklch(0.28 0.03 50 / 0.55)', background: 'transparent', color: 'var(--cream-bright)', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
          Skip
        </button>
      </div>
    </div>
  );
}
