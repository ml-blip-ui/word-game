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
  flagged: boolean;
  scoredTeamIdx: number | null;
  category: CategoryKey;
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
  allplayCountThisTurn: number;
  allplayPlan: AllplayPlan | null;
  currentWord: DrawnWord | null;
  songPaused: boolean;

  muted: boolean;
  loadingWord: boolean;
  error: string | null;

  bestScore: number | null; // for the currently-matching settings, fetched at game start
}
