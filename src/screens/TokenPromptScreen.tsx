import type { CategoryKey } from '../lib/categories';
import { categoryMeta } from '../lib/categories';
import type { Team } from '../lib/types';
import { TokenRow } from '../components/TokenIcon';

interface TokenPromptScreenProps {
  categoryKey: CategoryKey;
  team: Team;
  onSpend: () => void;
  onDecline: () => void;
}

export function TokenPromptScreen({ categoryKey, team, onSpend, onDecline }: TokenPromptScreenProps) {
  const cat = categoryMeta(categoryKey);
  const tokensLeft = team.totalTokens - team.tokensSpent;
  const noneLeft = team.tokensSpent >= team.totalTokens;

  return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>Landed on</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 34, lineHeight: 1.1, color: cat.color }}>{cat.label}</div>
      <div style={{ marginTop: 4 }}>
        <TokenRow total={team.totalTokens} spent={team.tokensSpent} color={team.color} size={40} />
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 16, color: 'oklch(0.4 0.02 50)', maxWidth: 280 }}>
        Spend a token now to double everything this turn — {team.name} has {tokensLeft} left.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', marginTop: 10 }}>
        <button
          onClick={onSpend}
          disabled={noneLeft}
          style={{
            padding: 20,
            borderRadius: '20px 15px 22px 16px',
            border: '2.2px solid var(--ink)',
            background: cat.color,
            color: 'var(--cream)',
            fontWeight: 800,
            fontSize: 17,
            cursor: noneLeft ? 'default' : 'pointer',
            opacity: noneLeft ? 0.4 : 1,
          }}
        >
          Spend token — double points
        </button>
        <button
          onClick={onDecline}
          style={{ padding: 18, borderRadius: '15px 20px 16px 22px', border: '2.2px solid var(--ink)', background: 'transparent', color: 'var(--ink)', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
        >
          Play normally
        </button>
      </div>
    </div>
  );
}
