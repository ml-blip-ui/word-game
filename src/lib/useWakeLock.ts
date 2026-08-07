import { useEffect } from 'react';

// Keeps the phone's screen awake while a game is in progress. Nobody
// touches the screen while describing a word, so without this the display
// dims and locks partway through a turn. Best-effort: browsers that don't
// support the Screen Wake Lock API just behave as before.
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const s = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void s.release();
          return;
        }
        sentinel = s;
      } catch {
        // Denied (e.g. battery saver) — nothing useful to do.
      }
    };

    void acquire();
    // The lock is released automatically when the tab is backgrounded;
    // re-acquire when the player comes back.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      try {
        void sentinel?.release();
      } catch {
        // Already released.
      }
    };
  }, [active]);
}
