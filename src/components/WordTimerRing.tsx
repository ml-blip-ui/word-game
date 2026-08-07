interface WordTimerRingProps {
  timeLeft: number;
  timeLimit: number;
  size?: number;
  strokeColor: string;
  trackColor?: string;
  textColor?: string;
}

export function WordTimerRing({ timeLeft, timeLimit, size = 76, strokeColor, trackColor = 'oklch(0.3 0.03 50 / 0.14)', textColor = 'var(--ink)' }: WordTimerRingProps) {
  const r = size / 2 - size * 0.092;
  const circ = 2 * Math.PI * r;
  const frac = timeLimit ? timeLeft / timeLimit : 0;
  const c = size / 2;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke={trackColor} strokeWidth={7} />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          transform={`rotate(-90 ${c} ${c})`}
          style={{ transition: 'stroke-dashoffset 0.9s linear' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-sans)',
          fontWeight: 800,
          fontSize: size >= 76 ? 24 : 23,
          color: textColor,
        }}
      >
        {timeLeft}
      </div>
    </div>
  );
}
