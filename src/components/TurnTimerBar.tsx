interface TurnTimerBarProps {
  pct: number;
  fillColor?: string;
  trackColor?: string;
}

export function TurnTimerBar({ pct, fillColor = 'oklch(0.45 0.03 50)', trackColor = 'oklch(0.3 0.03 50 / 0.12)' }: TurnTimerBarProps) {
  return (
    <div style={{ height: 7, marginTop: 10, borderRadius: 4, background: trackColor, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, background: fillColor, transition: 'width 1s linear' }} />
    </div>
  );
}

export function formatClock(seconds: number): string {
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
