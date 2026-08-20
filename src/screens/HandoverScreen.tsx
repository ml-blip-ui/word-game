import { useEffect, useRef, useState } from 'react';
import type { Team } from '../lib/types';
import { TokenRow } from '../components/TokenIcon';
import { fitSize } from '../lib/wordSize';

interface HandoverScreenProps {
  team: Team;
  onReady: () => void;
}

export function HandoverScreen({ team, onReady }: HandoverScreenProps) {
  const playerName = team.players[team.playerIdx]?.name ?? '';
  const tokensLeft = team.totalTokens - team.tokensSpent;

  // A fixed 56px overflowed the phone on longer names (Sharminee), so the
  // name is measured against the space it actually has, same as the word
  // during play.
  const nameRef = useRef<HTMLDivElement>(null);
  const [nameFontSize, setNameFontSize] = useState(56);

  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    const update = () => setNameFontSize(fitSize(playerName, 56, el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [playerName]);

  return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', gap: 26, padding: 32, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 15, letterSpacing: '0.16em', textTransform: 'uppercase', color: team.color }}>{team.name}</div>
      <div
        ref={nameRef}
        style={{ width: '100%', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: nameFontSize, lineHeight: 1.05, color: 'var(--ink)', overflowWrap: 'normal' }}
      >
        {playerName}
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 17, color: 'oklch(0.4 0.02 50)', maxWidth: 280 }}>Give the phone to {playerName}.</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <TokenRow total={team.totalTokens} spent={team.tokensSpent} color={team.color} size={46} />
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>{tokensLeft} tokens left</span>
      </div>
      <button
        onClick={onReady}
        style={{ marginTop: 14, padding: '20px 52px', borderRadius: '22px 16px 20px 15px', border: '2.2px solid var(--ink)', background: team.color, color: 'var(--cream)', fontWeight: 800, fontSize: 19, cursor: 'pointer' }}
      >
        Ready
      </button>
    </div>
  );
}
