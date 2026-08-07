import { useState } from 'react';
import type { Mode, Team } from '../lib/types';
import { TokenRow } from '../components/TokenIcon';

interface ScoreboardScreenProps {
  mode: Mode;
  teams: Team[];
  collaborativeScore: number;
  bestScore: number | null;
  gameOver: boolean;
  endedEarly: boolean;
  settingsSummary: string;
  onNext: () => void;
  onEndGame: () => void;
}

export function ScoreboardScreen({ mode, teams, collaborativeScore, bestScore, gameOver, endedEarly, settingsSummary, onNext, onEndGame }: ScoreboardScreenProps) {
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const pooled = mode !== 'competitive';
  const soloOrPooledScore = mode === 'collaborative' ? collaborativeScore : teams[0]?.score ?? 0;
  const maxScore = Math.max(...teams.map((t) => t.score));
  const winners = teams.filter((t) => t.score === maxScore);

  let headline: string | null = null;
  if (gameOver) {
    if (endedEarly) {
      headline = mode === 'competitive' && winners.length === 1 ? `Called it — ${winners[0].name} ahead` : 'Called it there';
    } else if (mode === 'competitive') {
      headline = winners.length > 1 ? "It's a tie!" : `${winners[0].name} wins!`;
    } else if (bestScore !== null && soloOrPooledScore > bestScore) {
      headline = 'New best score!';
    } else {
      headline = 'Game over';
    }
  }

  return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', gap: 18, padding: 30 }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
        {headline ?? 'Scoreboard'}
      </div>

      {pooled ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px 20px', borderRadius: '18px 14px 20px 15px', border: '2.2px solid var(--ink)', background: 'var(--surface)', width: '100%' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 44, color: 'var(--ink)' }}>{soloOrPooledScore}</span>
          {bestScore !== null && (
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14, color: 'var(--ink-muted)' }}>Best for these settings: {bestScore}</span>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          {teams.map((t) => (
            <div
              key={t.gameTeamId}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderRadius: '18px 14px 20px 15px', border: '2.2px solid var(--ink)', background: 'var(--surface)' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 16, color: t.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.name}</span>
                <TokenRow total={t.totalTokens} spent={t.tokensSpent} color={t.color} size={28} />
              </div>
              <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 38, color: 'var(--ink)' }}>{t.score}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, color: 'var(--ink-muted)' }}>{settingsSummary}</div>
      <button
        onClick={onNext}
        style={{ marginTop: 8, padding: '20px 48px', borderRadius: '22px 16px 20px 15px', border: '2.2px solid var(--ink)', background: 'var(--ink)', color: 'var(--cream)', fontWeight: 800, fontSize: 18, cursor: 'pointer' }}
      >
        {gameOver ? 'New game' : 'Next turn'}
      </button>

      {!gameOver &&
        (confirmingEnd ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14, color: 'var(--ink-muted)', textAlign: 'center' }}>
              End here and keep these scores?
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onEndGame}
                style={{ padding: '12px 22px', borderRadius: '16px 12px 15px 13px', border: '2px solid var(--rust)', background: 'var(--rust)', color: 'var(--cream)', fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}
              >
                End game
              </button>
              <button
                onClick={() => setConfirmingEnd(false)}
                style={{ padding: '12px 22px', borderRadius: '12px 16px 13px 15px', border: '2px solid oklch(0.3 0.03 50 / 0.4)', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
              >
                Keep playing
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingEnd(true)}
            style={{ marginTop: 2, padding: 0, border: 'none', background: 'none', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14, color: 'var(--ink-muted)', cursor: 'pointer' }}
          >
            End game here
          </button>
        ))}
    </div>
  );
}
