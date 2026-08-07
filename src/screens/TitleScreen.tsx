import { useState } from 'react';
import { TitlePlate } from '../components/TitlePlate';

const UNLOCK_KEY = 'blurticulate_unlocked';
const PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'wordz';

interface TitleScreenProps {
  onContinue: () => void;
}

// The password check is a soft gate against casual sharing (the word bank
// isn't ours to redistribute), not real security — it ships in the client
// bundle like any Vite env var. That's an accepted tradeoff given what it's
// protecting against.
export function TitleScreen({ onContinue }: TitleScreenProps) {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(UNLOCK_KEY) === 'true');
  const [input, setInput] = useState('');
  const [wrong, setWrong] = useState(false);

  const submit = () => {
    if (input.trim().toLowerCase() === PASSWORD.toLowerCase()) {
      localStorage.setItem(UNLOCK_KEY, 'true');
      setUnlocked(true);
      setWrong(false);
    } else {
      setWrong(true);
    }
  };

  return (
    <div className="screen" style={{ position: 'relative' }}>
      <TitlePlate />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 28,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 22,
            padding: '36px 30px',
            borderRadius: '26px 20px 28px 22px',
            border: '2.2px solid var(--ink)',
            background: 'oklch(0.96 0.014 80 / 0.92)',
            textAlign: 'center',
            maxWidth: 320,
          }}
        >
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 44, lineHeight: 1.05, color: 'var(--ink)' }}>Blurticulate</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 15, color: 'var(--ink-muted)', letterSpacing: '0.02em' }}>
            Say everything except the word.
          </div>

          {unlocked ? (
            <button
              onClick={onContinue}
              style={{ marginTop: 4, padding: '18px 48px', borderRadius: '22px 16px 20px 15px', border: '2.2px solid var(--ink)', background: 'var(--rust)', color: 'var(--cream)', fontWeight: 800, fontSize: 18, cursor: 'pointer' }}
            >
              Continue
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%', marginTop: 4 }}>
              <input
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setWrong(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="Password"
                type="password"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '16px 12px 15px 13px',
                  border: `2px solid ${wrong ? 'var(--rust)' : 'oklch(0.3 0.03 50 / 0.4)'}`,
                  background: 'var(--surface)',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                  fontSize: 16,
                  color: 'var(--ink)',
                  textAlign: 'center',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {wrong && <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13, color: 'var(--rust)' }}>Not quite.</div>}
              <button
                onClick={submit}
                style={{ padding: '16px 44px', borderRadius: '20px 15px 22px 16px', border: '2.2px solid var(--ink)', background: 'var(--ink)', color: 'var(--cream)', fontWeight: 800, fontSize: 17, cursor: 'pointer' }}
              >
                Enter
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
