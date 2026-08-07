import { CATEGORIES } from '../lib/categories';

function polar(c: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [c + r * Math.sin(rad), c - r * Math.cos(rad)];
}

interface WheelProps {
  rotationDeg: number;
  spinning: boolean;
  size?: number;
}

export function Wheel({ rotationDeg, spinning, size = 330 }: WheelProps) {
  const c = size / 2;
  const r = size / 2 - 5;
  const segAng = 360 / CATEGORIES.length;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div
        style={{
          position: 'absolute',
          top: -6,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 5,
          width: 0,
          height: 0,
          borderLeft: '14px solid transparent',
          borderRight: '14px solid transparent',
          borderTop: '26px solid var(--ink)',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          transform: `rotate(${rotationDeg}deg)`,
          transition: spinning ? 'transform 2.8s cubic-bezier(0.16, 0.86, 0.18, 1)' : 'none',
        }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {CATEGORIES.map((cat, i) => {
            const [x0, y0] = polar(c, r, i * segAng - segAng / 2);
            const [x1, y1] = polar(c, r, i * segAng + segAng / 2);
            const path = `M${c} ${c} L${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
            return <path key={cat.key} d={path} fill={cat.color} stroke={cat.color} strokeWidth={1} />;
          })}
          <circle cx={c} cy={c} r={r - 1} fill="none" stroke="var(--ink)" strokeWidth={3} />
          <circle cx={c} cy={c} r={13} fill="var(--ink)" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {CATEGORIES.map((cat, i) => (
            <div key={cat.key} style={{ position: 'absolute', inset: 0, transform: `rotate(${(i * segAng).toFixed(2)}deg)` }}>
              <span
                style={{
                  position: 'absolute',
                  top: 26,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: size * 0.4,
                  textAlign: 'center',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 800,
                  fontSize: 13,
                  lineHeight: 1.15,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--cream)',
                }}
              >
                {cat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
