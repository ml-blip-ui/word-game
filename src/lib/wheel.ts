// Wheel spin geometry, kept pure and separate from the game hook so it can
// be exercised statistically (see the wheel distribution test) rather than
// only by eye a few spins at a time.

export interface SpinPlan {
  /** Index of the chosen category in CATEGORIES. */
  idx: number;
  /** Absolute rotation to animate the disc to, in degrees. */
  targetDeg: number;
}

export const SPIN_TURNS = 5;
/**
 * Jitter keeps the disc from settling dead centre. Capped at a quarter of a
 * segment either side (±15° on a six-segment wheel) so the pointer always
 * finishes comfortably inside the chosen segment — a segment spans ±30°
 * around its centre, so the pointer is never within 15° of a boundary.
 */
export const JITTER_FRACTION = 0.5;

/**
 * Plans a spin from the disc's *current* angle. The resting angle carries
 * over between turns, so the rotation to apply has to be computed as a
 * delta from where the disc actually is — adding a fixed absolute offset to
 * a non-zero starting angle lands the pointer on the wrong segment.
 */
export function planSpin(currentRotationDeg: number, categoryCount: number, rng: () => number = Math.random): SpinPlan {
  const seg = 360 / categoryCount;
  const idx = Math.floor(rng() * categoryCount);
  const jitter = (rng() - 0.5) * (seg * JITTER_FRACTION);

  const currentMod = norm360(currentRotationDeg);
  const desired = norm360(-idx * seg + jitter);
  const delta = norm360(desired - currentMod);

  return { idx, targetDeg: currentRotationDeg + SPIN_TURNS * 360 + delta };
}

/**
 * Which segment sits under the pointer (fixed at the top, 0°) for a given
 * disc rotation. This is the geometric inverse of planSpin and exists so
 * tests can assert that what the player sees matches what the game chose.
 */
export function segmentUnderPointer(rotationDeg: number, categoryCount: number): number {
  const seg = 360 / categoryCount;
  return Math.round(norm360(-rotationDeg) / seg) % categoryCount;
}

function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}
