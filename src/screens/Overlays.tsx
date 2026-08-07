import { TokenIcon } from '../components/TokenIcon';

export function TokenAnnouncementOverlay({ teamName, teamColor }: { teamName: string; teamColor: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: 'oklch(0.3 0.03 50 / 0.94)',
        animation: 'fade-up 0.25s ease',
      }}
    >
      <TokenIcon spent={false} color={teamColor} size={96} />
      <div style={{ textAlign: 'center', color: 'var(--cream)' }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 15, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.8 }}>{teamName} played a</div>
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 46, marginTop: 8 }}>TOKEN</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 16, marginTop: 10, opacity: 0.85 }}>Double points this turn</div>
      </div>
    </div>
  );
}

export function AllplayAnnouncementOverlay({ categoryColor }: { categoryColor: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: categoryColor, animation: 'fade-up 0.2s ease' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 44, color: 'var(--cream-bright)', animation: 'pulse 0.9s ease infinite' }}>ALL PLAY</div>
    </div>
  );
}

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: 14,
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '14px 16px',
        borderRadius: '16px 12px 15px 13px',
        border: '2px solid var(--rust)',
        background: 'var(--flag-bg)',
        animation: 'fade-up 0.2s ease',
      }}
    >
      <span style={{ flex: 1, fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14, color: 'var(--ink)', lineHeight: 1.4 }}>{message}</span>
      <button
        onClick={onDismiss}
        style={{ border: 'none', background: 'none', padding: 0, fontSize: 18, lineHeight: 1, color: 'var(--ink-muted)', cursor: 'pointer' }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
