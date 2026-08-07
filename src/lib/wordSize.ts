// Corben 700 runs about 0.82em per character; size so the longest single
// token fits the content width, and the whole phrase fits within ~2 lines.
const EM = 0.82;

export function fitSize(text: string, base: number, containerW = 320, scale = 1): number {
  const t = (text ?? '').trim();
  if (!t) return Math.round(base * scale);
  const longest = t.split(/\s+/).reduce((m, w) => Math.max(m, w.length), 0);
  const byToken = containerW / (longest * EM);
  const byPhrase = (containerW * 1.9) / (t.length * EM);
  const size = Math.max(20, Math.min(base, byToken, byPhrase));
  return Math.round(size * scale);
}
