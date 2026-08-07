import type { AllplayPlan } from './types';

// Placement is described in the gameplay spec as "middle third of the turn,
// never first, never last" — but a turn's word count isn't known in advance
// (it's time-based, not word-count-based), so placement is planned against
// elapsed-turn-time fractions rather than word index. A target fraction is
// picked once per turn inside the middle third (1/3 - 2/3); the next word
// drawn once elapsed time crosses that target becomes the all-play. A second
// all-play is a per-turn coin flip (15-20%, using the midpoint) decided at
// the same time, and only placed if there's still room left in the window
// after the first one lands.
export function planAllplay(): AllplayPlan {
  return {
    firstTargetFrac: 1 / 3 + Math.random() * (1 / 3),
    secondEligible: Math.random() < 0.175,
    secondTargetFrac: null,
  };
}

const MIDDLE_THIRD_END = 2 / 3;

// Decides whether a NEW all-play occurrence starts on this draw. An
// occurrence, once started, can serve up to two words (skip chains to a
// second all-play word); that continuation is handled by the game engine,
// not here — this function is only consulted between occurrences.
export interface AllplayCheckInput {
  mode: 'practice' | 'collaborative' | 'competitive';
  teamCount: number;
  turnWordCount: number; // words drawn so far this turn, before this draw
  turnTimeLeft: number;
  turnSeconds: number;
  turnExpired: boolean;
  occurrencesDone: number;
  plan: AllplayPlan | null;
}

export interface AllplayCheckResult {
  isAllplay: boolean;
  updatedPlan: AllplayPlan | null;
}

export function checkAllplay(input: AllplayCheckInput): AllplayCheckResult {
  const { mode, teamCount, turnWordCount, turnTimeLeft, turnSeconds, turnExpired, occurrencesDone, plan } = input;

  // Once the turn timer has expired we're in "finish what you started"
  // territory — the word in progress when the buzzer sounds is by
  // definition the last one, so no new all-play may start here.
  if (mode !== 'competitive' || teamCount <= 1 || !plan || turnWordCount === 0 || occurrencesDone >= 2 || turnExpired) {
    return { isAllplay: false, updatedPlan: plan };
  }

  const elapsedFrac = 1 - turnTimeLeft / turnSeconds;

  if (occurrencesDone === 0) {
    if (elapsedFrac >= plan.firstTargetFrac) {
      return { isAllplay: true, updatedPlan: plan };
    }
    return { isAllplay: false, updatedPlan: plan };
  }

  if (occurrencesDone === 1 && plan.secondEligible) {
    let updatedPlan = plan;
    if (plan.secondTargetFrac === null) {
      const remaining = MIDDLE_THIRD_END - elapsedFrac;
      if (remaining <= 0) {
        updatedPlan = { ...plan, secondEligible: false };
        return { isAllplay: false, updatedPlan };
      }
      updatedPlan = { ...plan, secondTargetFrac: elapsedFrac + Math.random() * remaining };
    }
    if (updatedPlan.secondTargetFrac !== null && elapsedFrac >= updatedPlan.secondTargetFrac) {
      return { isAllplay: true, updatedPlan };
    }
    return { isAllplay: false, updatedPlan };
  }

  return { isAllplay: false, updatedPlan: plan };
}
