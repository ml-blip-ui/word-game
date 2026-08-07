import type { Mode, Team } from '../lib/types';
import { TokenRow } from '../components/TokenIcon';

interface ScoreboardScreenProps {
  mode: Mode;
  teams: Team[];
  collaborativeScore: number;
  bestScore: number | null;
  gameOver: boolean;
  settingsSummary: string;
  onNext: () => void;
}

export function ScoreboardScreen({ mode, teams, collaborativeScore, bestScore, gameOver, settingsSummary, onNext }: ScoreboardScreenProps) {
  const pooled = mode !== 'competitive';
  const soloOrPooledScore = mode === 'collaborative' ? collaborativeScore : teams[0]?.score ?? 0;
  const maxScore = Math.max(...teams.map((t) => t.score));
  const winners = teams.filter((t) => t.score === maxScore);

  let headline: string | null = null;
  if (gameOver) {
    if (mode === 'competitive') {
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
    </div>
  );
}
