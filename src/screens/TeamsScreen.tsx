import { useEffect, useState } from 'react';
import type { DraftTeam } from '../lib/types';
import { fetchPlayerSuggestions } from '../lib/persistence';
import { Button } from '../components/Button';

interface TeamsScreenProps {
  mode: string | null;
  teamCount: number;
  draft: DraftTeam[];
  onBack: () => void;
  onSetTeamCount: (n: number) => void;
  onAddPlayer: (teamIdx: number) => void;
  onRemovePlayer: (teamIdx: number, playerIdx: number) => void;
  onRenamePlayer: (teamIdx: number, playerIdx: number, name: string) => void;
  onMovePlayer: (fromTeamIdx: number, playerIdx: number, toTeamIdx: number) => void;
  onContinue: () => void;
}

export function TeamsScreen({ mode, teamCount, draft, onBack, onSetTeamCount, onAddPlayer, onRemovePlayer, onRenamePlayer, onMovePlayer, onContinue }: TeamsScreenProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    fetchPlayerSuggestions().then(setSuggestions).catch(() => setSuggestions([]));
  }, []);

  const canContinue = draft.every((t) => t.players.length >= 1) && draft.some((t) => t.players.length >= 1);

  return (
    <div className="screen" style={{ gap: 16, padding: '30px 26px' }}>
      <button onClick={onBack} style={{ alignSelf: 'flex-start', padding: 0, border: 'none', background: 'none', fontWeight: 700, fontSize: 15, color: 'var(--ink-muted)', cursor: 'pointer' }}>
        ‹ Back
      </button>
      <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 32, color: 'var(--ink)' }}>Teams</div>

      {mode !== 'practice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <span style={labelStyle}>How many teams</span>
          <div style={{ display: 'flex', gap: 10 }}>
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => onSetTeamCount(n)}
                style={{ flex: 1, padding: '16px 0', borderRadius: '16px 12px 15px 13px', border: '2.2px solid var(--ink)', background: teamCount === n ? 'var(--ink)' : 'var(--surface)', color: teamCount === n ? 'var(--cream)' : 'var(--ink)', fontWeight: 800, fontSize: 19, cursor: 'pointer' }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <datalist id="player-suggestions">
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
        {draft.map((t, ti) => (
          <div key={ti} style={{ padding: '14px 16px', borderRadius: '18px 14px 20px 15px', border: '2px solid oklch(0.3 0.03 50 / 0.35)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.color }}>{t.name}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {t.players.map((p, pi) => (
                <span key={pi} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 6px 6px 12px', borderRadius: 999, border: '2px solid oklch(0.3 0.03 50 / 0.4)' }}>
                  <input
                    value={p}
                    list="player-suggestions"
                    onChange={(e) => onRenamePlayer(ti, pi, e.target.value)}
                    style={{ border: 'none', background: 'none', outline: 'none', width: `${Math.max(3, p.length)}ch`, fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}
                  />
                  {draft.length > 1 && (
                    <button
                      onClick={() => onMovePlayer(ti, pi, (ti + 1) % draft.length)}
                      title="Move to next team"
                      style={{ border: 'none', background: 'none', padding: 0, fontSize: 14, color: 'var(--ink-muted)', cursor: 'pointer' }}
                    >
                      ⇄
                    </button>
                  )}
                  <button onClick={() => onRemovePlayer(ti, pi)} style={{ border: 'none', background: 'none', padding: 0, fontSize: 16, lineHeight: 1, color: 'oklch(0.5 0.02 50)', cursor: 'pointer' }}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <button
              onClick={() => onAddPlayer(ti)}
              style={{ alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 999, border: '2px dashed oklch(0.3 0.03 50 / 0.4)', background: 'none', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14, color: 'var(--ink-muted)', cursor: 'pointer' }}
            >
              + Add player
            </button>
          </div>
        ))}
      </div>

      <Button onClick={onContinue} disabled={!canContinue} style={{ opacity: canContinue ? 1 : 0.45 }}>
        Continue
      </Button>
    </div>
  );
}

const labelStyle = { fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--ink-muted)' };
