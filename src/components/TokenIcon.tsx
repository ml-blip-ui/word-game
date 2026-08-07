interface TokenIconProps {
  spent: boolean;
  color: string;
  size?: number;
}

// Octagon "stop sign" with x2 centred — spent tokens go transparent/dimmed.
export function TokenIcon({ spent, color, size = 40 }: TokenIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ opacity: spent ? 0.3 : 1 }}>
      <polygon
        points="14,3 34,3 45,14 45,34 34,45 14,45 3,34 3,14"
        fill={spent ? 'transparent' : color}
        stroke="var(--ink)"
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      <text x="24" y="25" textAnchor="middle" dominantBaseline="central" fontFamily="Manrope" fontWeight={800} fontSize={17} fill={spent ? 'var(--ink)' : 'var(--cream)'}>
        ×2
      </text>
    </svg>
  );
}

export function TokenRow({ total, spent, color, size = 40 }: { total: number; spent: number; color: string; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <TokenIcon key={i} spent={i < spent} color={color} size={size} />
      ))}
    </div>
  );
}
