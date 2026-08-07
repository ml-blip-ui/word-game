import type { GameState } from './types';

// "Play does not stop the moment the condition is met... it continues until
// every team has taken the same number of turns" (spec §10). Round count is
// already a multiple of the team count, so it satisfies this automatically.
// For time and points, whether the condition has been met is a pure function
// of current state — no separate "met at round N" flag needs to be tracked.
export function winConditionMet(state: Pick<GameState, 'winType' | 'winValue' | 'gameStartedAt' | 'mode' | 'collaborativeScore' | 'teams'>): boolean {
  if (state.winType === 'rounds') return true; // handled entirely by totalTurnsPlayed in isGameOver
  if (state.winType === 'time') {
    if (state.gameStartedAt === null) return false;
    const elapsedMinutes = (Date.now() - state.gameStartedAt) / 60000;
    return elapsedMinutes >= state.winValue;
  }
  // points
  const target = state.mode === 'collaborative' ? state.collaborativeScore : Math.max(0, ...state.teams.map((t) => t.score));
  return target >= state.winValue;
}

export function isGameOver(
  state: Pick<GameState, 'winType' | 'winValue' | 'gameStartedAt' | 'mode' | 'collaborativeScore' | 'teams' | 'totalTurnsPlayed'>,
): boolean {
  if (state.teams.length === 0) return false;
  if (state.winType === 'rounds') return state.totalTurnsPlayed >= state.winValue;
  if (!winConditionMet(state)) return false;
  return state.totalTurnsPlayed % state.teams.length === 0;
}
