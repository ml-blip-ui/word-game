import type { CategoryKey } from './categories';

export type Mode = 'practice' | 'collaborative' | 'competitive';
export type WinType = 'time' | 'points' | 'rounds';

export type Screen =
  | 'title'
  | 'chooseGroup'
  | 'mode'
  | 'setupTeams'
  | 'setupLength'
  | 'setupWin'
  | 'handover'
  | 'wheel'
  | 'token'
  | 'play'
  | 'song'
  | 'allplay'
  | 'summary'
  | 'scoreboard'
  | 'leaderboard';

export interface DraftTeam {
  name: string;
  color: string;
  players: string[];
}

export interface Team {
  gameTeamId: string; // db id — Team objects only exist once the game row does
  teamIndex: number;
  name: string;
  color: string;
  players: { name: string; playerId: string }[];
  playerIdx: number;
  score: number;
  totalTokens: number;
  tokensSpent: number;
}

export type DrawnWord =
  | { kind: 'word'; id: string; text: string; category: CategoryKey }
  | { kind: 'song'; id: string; title: string; artist: string };

export interface TurnWordEntry {
  turnEventId: string | null;
  text: string;
  outcome: 'correct' | 'skip' | 'auto_skip';
  doubled: boolean;
  isAllplay: boolean;
  flagged: boolean; // said-the-word slip: point reversed and penalised
  reported: boolean; // "this word is impossible" — no scoring effect
  reportId: string | null;
  scoredTeamIdx: number | null;
  category: CategoryKey; // the turn's category (may be 'random')
  sourceCategory: CategoryKey | null; // where the word actually came from
  wordId: string | null;
  songId: string | null;
}

export interface AllplayPlan {
  firstTargetFrac: number;
  secondEligible: boolean;
  secondTargetFrac: number | null;
}

export interface GameState {
  screen: Screen;
  mode: Mode | null;

  teamCount: number;
  draft: DraftTeam[];
  activeGroupId: string | null;
  groupRoster: { id: string; name: string }[] | null;

  turnSeconds: number;
  winType: WinType;
  winValue: number;

  gameId: string | null;
  teams: Team[];
  currentTeamIdx: number;
  totalTurnsPlayed: number;
  collaborativeScore: number;

  gameStartedAt: number | null;
  endedEarly: boolean;
  // Set once, at the post-turn checkpoint in confirmSummary. The win
  // condition is only ever evaluated there — never live — so time crossing
  // the limit while the scoreboard is being argued over doesn't change
  // what buttons mean between render and press.
  gameFinished: boolean;

  categoryKey: CategoryKey | null;
  wheelRotationDeg: number;
  wheelSpinning: boolean;

  tokenSpentThisTurn: boolean;
  showTokenAnnouncement: boolean;
  showAllplayAnnouncement: boolean;

  turnTimeLeft: number;
  turnExpired: boolean;
  wordTimeLeft: number;
  wordTimeLimit: number;

  turnWords: TurnWordEntry[];
  turnWordCount: number;
  // An all-play "occurrence" can span up to two words: if the first is
  // skipped, another all-play word is served before normal play resumes
  // (gameplay spec §8). wordsInOccurrence is 0 when not in an all-play.
  allplayWordsInOccurrence: number;
  allplayOccurrencesDone: number;
  allplayPlan: AllplayPlan | null;
  currentWord: DrawnWord | null;
  songPaused: boolean;

  muted: boolean;
  loadingWord: boolean;
  error: string | null;

  bestScore: number | null; // for the currently-matching settings, fetched at game start
}
