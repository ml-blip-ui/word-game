import type { CategoryKey } from './categories';

// The wheel still lands on exactly the category the game plays — the
// sequencing here only decides *which* category is chosen, replacing an
// independent uniform roll with a sequence that feels fair as well as being
// fair. Two guarantees:
//
//   1. Bag rule: categories are dealt from a shuffled bag holding one of
//      each, so no category recurs until every other has come up. This is
//      the guarantee the whole room can see on the wheel, so it wins when
//      the two rules conflict.
//   2. Player spacing: a player shouldn't get the same category more often
//      than one turn in three of their own, so the two categories from
//      their last two turns are excluded where possible.
//
// A conflict happens when the bag has run down to only categories that are
// blocked for the current player. Then the bag rule holds and the spacing
// rule degrades as gently as it can: of the blocked options, the one that
// player saw longest ago is chosen.

export interface PickCategoryInput {
  /** Categories left in the current cycle. Empty means "start a new cycle". */
  bag: CategoryKey[];
  /** Every category the wheel can land on, used to refill the bag. */
  allKeys: readonly CategoryKey[];
  /** This player's recent categories, most recent first. */
  recent: readonly CategoryKey[];
  rng?: () => number;
}

export interface PickCategoryResult {
  key: CategoryKey;
  /** The bag after this pick, ready to be stored back on game state. */
  bag: CategoryKey[];
  /** True when the player-spacing rule had to be bent to keep the bag rule. */
  spacingCompromised: boolean;
}

/** How many of a player's previous categories are excluded: 2 gives "at
 *  most one turn in three". */
export const PLAYER_SPACING = 2;

export function pickCategory({ bag, allKeys, recent, rng = Math.random }: PickCategoryInput): PickCategoryResult {
  // Refill on empty. A fresh cycle is shuffled so the order within it is
  // unpredictable even though its contents are fixed.
  const working = bag.length > 0 ? bag.slice() : shuffle(allKeys.slice(), rng);

  const blocked = recent.slice(0, PLAYER_SPACING);
  const allowed = working.filter((k) => !blocked.includes(k));

  let key: CategoryKey;
  let spacingCompromised = false;

  if (allowed.length > 0) {
    key = allowed[Math.floor(rng() * allowed.length)];
  } else {
    // Everything left in the bag is blocked for this player. Keep the bag
    // rule and pick whichever they saw longest ago — a category from two
    // turns back rather than their immediately previous one.
    spacingCompromised = true;
    key = working.reduce((best, candidate) => (recentRank(candidate, blocked) > recentRank(best, blocked) ? candidate : best), working[0]);
  }

  return { key, bag: working.filter((k) => k !== key), spacingCompromised };
}

/** Higher = longer ago. Not in the blocked list at all ranks highest. */
function recentRank(key: CategoryKey, blocked: readonly CategoryKey[]): number {
  const i = blocked.indexOf(key);
  return i === -1 ? Number.POSITIVE_INFINITY : i;
}

export function rememberCategory(recent: readonly CategoryKey[], key: CategoryKey): CategoryKey[] {
  return [key, ...recent].slice(0, PLAYER_SPACING);
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
