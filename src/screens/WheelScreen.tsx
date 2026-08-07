import { Wheel } from '../components/Wheel';

interface WheelScreenProps {
  rotationDeg: number;
  spinning: boolean;
  onSpin: () => void;
}

export function WheelScreen({ rotationDeg, spinning, onSpin }: WheelScreenProps) {
  return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', gap: 30, padding: 24 }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'oklch(0.4 0.02 50)' }}>Spin for a category</div>
      <Wheel rotationDeg={rotationDeg} spinning={spinning} />
      <button
        onClick={onSpin}
        disabled={spinning}
        style={{
          padding: '20px 56px',
          borderRadius: '18px 22px 15px 20px',
          border: '2.2px solid var(--ink)',
          background: 'var(--ink)',
          color: 'var(--cream)',
          fontWeight: 800,
          fontSize: 19,
          cursor: spinning ? 'default' : 'pointer',
          opacity: spinning ? 0.5 : 1,
        }}
      >
        Spin
      </button>
    </div>
  );
}
