import { Button } from '../components/Button';

interface RoundLengthScreenProps {
  turnSeconds: number;
  onBack: () => void;
  onSet: (n: number) => void;
  onContinue: () => void;
}

export function RoundLengthScreen({ turnSeconds, onBack, onSet, onContinue }: RoundLengthScreenProps) {
  return (
    <div className="screen" style={{ gap: 20, padding: '30px 26px' }}>
      <button onClick={onBack} style={{ alignSelf: 'flex-start', padding: 0, border: 'none', background: 'none', fontWeight: 700, fontSize: 15, color: 'var(--ink-muted)', cursor: 'pointer' }}>
        ‹ Back
      </button>
      <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 32, color: 'var(--ink)' }}>Round length</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 16, color: 'var(--ink-muted)', marginTop: -10 }}>Seconds per turn.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 6 }}>
        {[60, 90, 120].map((n) => (
          <button
            key={n}
            onClick={() => onSet(n)}
            style={{
              padding: 22,
              borderRadius: '20px 15px 22px 16px',
              border: '2.2px solid var(--ink)',
              background: turnSeconds === n ? 'var(--ink)' : 'var(--surface)',
              color: turnSeconds === n ? 'var(--cream)' : 'var(--ink)',
              fontWeight: 800,
              fontSize: 20,
              cursor: 'pointer',
            }}
          >
            {n} seconds per turn
          </button>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <Button onClick={onContinue} color="var(--gradient-2)">Continue</Button>
    </div>
  );
}
