export type WordCategoryKey = 'object' | 'nature' | 'person' | 'action' | 'world';
export type CategoryKey = WordCategoryKey | 'random';

export interface CategoryMeta {
  key: CategoryKey;
  label: string;
  color: string;
}

export const WORD_CATEGORIES: readonly WordCategoryKey[] = ['object', 'nature', 'person', 'action', 'world'];

export const CATEGORIES: readonly CategoryMeta[] = [
  { key: 'world', label: 'World', color: 'var(--cat-world)' },
  { key: 'object', label: 'Object', color: 'var(--cat-object)' },
  { key: 'nature', label: 'Nature', color: 'var(--cat-nature)' },
  { key: 'person', label: 'Person', color: 'var(--cat-person)' },
  { key: 'action', label: 'Action', color: 'var(--cat-action)' },
  { key: 'random', label: 'Random', color: 'var(--cat-random)' },
];

export function categoryMeta(key: CategoryKey): CategoryMeta {
  const found = CATEGORIES.find((c) => c.key === key);
  if (!found) throw new Error(`Unknown category ${key}`);
  return found;
}

export const TEAM_COLORS = ['var(--team-1)', 'var(--team-2)', 'var(--team-3)', 'var(--team-4)'] as const;

// Random draws from the 5 word categories and the song pool as six equally
// likely buckets, so a Random turn averages roughly one song every six words.
// The gameplay spec doesn't pin an exact weighting; this is the assumption.
export function pickRandomBucket(): WordCategoryKey | 'song' {
  const buckets: (WordCategoryKey | 'song')[] = [...WORD_CATEGORIES, 'song'];
  return buckets[Math.floor(Math.random() * buckets.length)];
}
