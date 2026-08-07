import { useEffect, useRef } from 'react';

// Full-bleed wallpaper of small random serif letters in varied colours —
// pure decorative texture, no message hidden in it. The actual title sits
// on top as ordinary legible text; see TitleScreen.
const LETTER_COLORS = [
  'oklch(0.55 0.09 195)',
  'oklch(0.64 0.12 75)',
  'oklch(0.55 0.09 125)',
  'oklch(0.6 0.1 15)',
  'oklch(0.55 0.12 45)',
  'oklch(0.52 0.07 255)',
  'oklch(0.5 0.1 300)',
];
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

export function TitlePlate() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function draw() {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      try {
        await document.fonts.load('700 16px Corben');
        await document.fonts.ready;
      } catch {
        // fall through with whatever font is available
      }
      if (cancelled) return;

      const w = container.clientWidth;
      const h = container.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const cell = 26;
      for (let gy = 0; gy <= h + cell; gy += cell) {
        for (let gx = 0; gx <= w + cell; gx += cell) {
          const x = gx + (Math.random() - 0.5) * cell * 0.9;
          const y = gy + (Math.random() - 0.5) * cell * 0.9;
          const letter = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
          const color = LETTER_COLORS[Math.floor(Math.random() * LETTER_COLORS.length)];
          const rotation = (Math.random() - 0.5) * 0.6;
          const size = 13 + (Math.random() - 0.5) * 6;

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rotation);
          ctx.font = `700 ${size}px Corben, serif`;
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.55 + Math.random() * 0.25;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(letter, 0, 0);
          ctx.restore();
        }
      }
    }

    void draw();
    const ro = new ResizeObserver(() => void draw());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}
