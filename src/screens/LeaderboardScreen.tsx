import { useEffect, useState } from 'react';
import { fetchLeaderboard, type LeaderboardRow } from '../lib/persistence';

export function LeaderboardScreen({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard()
      .then(setRows)
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  return (
    <div className="screen" style={{ gap: 16, padding: '30px 26px' }}>
      <button onClick={onBack} style={{ alignSelf: 'flex-start', padding: 0, border: 'none', background: 'none', fontWeight: 700, fontSize: 15, color: 'var(--ink-muted)', cursor: 'pointer' }}>
        ‹ Back
      </button>
      <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 32, color: 'var(--ink)' }}>Leaderboard</div>
      {error && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-muted)' }}>Couldn't load stats: {error}</div>}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 9, minHeight: 0 }}>
        {rows?.length === 0 && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--ink-muted)' }}>No games played yet.</div>}
        {rows?.map((r, i) => (
          <div key={r.player_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '16px 12px 15px 13px', border: '2px solid oklch(0.3 0.03 50 / 0.35)', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14, color: 'var(--ink-muted)' }}>{i + 1}</span>
              <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>{r.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13, color: 'var(--ink-muted)' }}>
                {r.games_played} games · {r.correct_count}✓ / {r.skip_count}✗
              </span>
              <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 22, color: 'var(--rust)' }}>{r.total_points}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
