import { useCallback, useEffect, useRef, useState } from 'react';
import type { CategoryKey } from './categories';
import { CATEGORIES, TEAM_COLORS } from './categories';
import type { DraftTeam, GameState, Mode, Team, TurnWordEntry, WinType } from './types';
import { drawNext } from './wordDraw';
import { planAllplay, checkAllplay } from './allplay';
import { isGameOver, winConditionMet } from './winConditions';
import { playCorrect, playSkip, playTokenSpent, playTurnExpired } from './sound';
import {
  createGame,
  createGamePlayer,
  createGameTeam,
  fetchBestScore,
  finishGame,
  logTurnEvent,
  recordBestScoreIfHigher,
  setTurnEventFlag,
  upsertPlayer,
} from './persistence';

const NAME_POOL = ['Sarah', 'Amir', 'Priya', 'Jonah', 'Mia', 'Tom', 'Rosa', 'Kit', 'Dev', 'Nell', 'Cass', 'Bea', 'Ravi', 'Ines'];

function buildDraft(teamCount: number, perTeam: number): DraftTeam[] {
  let n = 0;
  return Array.from({ length: teamCount }, (_, ti) => ({
    name: `Team ${ti + 1}`,
    color: TEAM_COLORS[ti % TEAM_COLORS.length],
    players: Array.from({ length: perTeam }, () => NAME_POOL[n++ % NAME_POOL.length]),
  }));
}

function initialState(): GameState {
  return {
    screen: 'mode',
    mode: null,
    teamCount: 2,
    draft: buildDraft(2, 2),
    turnSeconds: 90,
    winType: 'time',
    winValue: 15,
    gameId: null,
    teams: [],
    currentTeamIdx: 0,
    totalTurnsPlayed: 0,
    collaborativeScore: 0,
    gameStartedAt: null,
    categoryKey: null,
    wheelRotationDeg: 0,
    wheelSpinning: false,
    tokenSpentThisTurn: false,
    showTokenAnnouncement: false,
    showAllplayAnnouncement: false,
    turnTimeLeft: 90,
    turnExpired: false,
    wordTimeLeft: 15,
    wordTimeLimit: 15,
    turnWords: [],
    turnWordCount: 0,
    allplayCountThisTurn: 0,
    allplayPlan: null,
    currentWord: null,
    songPaused: false,
    muted: false,
    loadingWord: false,
    bestScore: null,
  };
}

export function useGame() {
  const [state, setState] = useState<GameState>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // stateRef is updated synchronously here, right away — not inside the
  // setState updater. React 18+ batches state updates, so a functional
  // updater passed to setState is not guaranteed to run synchronously; code
  // that calls patch() and then immediately reads stateRef.current (e.g.
  // startPlay() patching allplayPlan and then calling drawNextWord()) needs
  // that read to see the new value right away, not after React's next flush.
  const patch = useCallback((updates: Partial<GameState> | ((s: GameState) => Partial<GameState>)) => {
    const upd = typeof updates === 'function' ? updates(stateRef.current) : updates;
    const next = { ...stateRef.current, ...upd };
    stateRef.current = next;
    setState(next);
  }, []);

  // Single 1s interval drives both clocks; everything else is event-driven.
  useEffect(() => {
    const id = setInterval(() => {
      const s = stateRef.current;
      if ((s.screen === 'play' || s.screen === 'allplay') && !s.songPaused) {
        const turnLeft = Math.max(0, s.turnTimeLeft - 1);
        const wordLeft = Math.max(0, s.wordTimeLeft - 1);
        const justExpired = !s.turnExpired && turnLeft === 0;
        if (justExpired) playTurnExpired(s.muted);
        const turnExpired = s.turnExpired || justExpired;
        if (wordLeft === 0) {
          patch({ wordTimeLeft: 0, turnTimeLeft: turnLeft, turnExpired });
          void resolveWord('auto_skip');
        } else {
          patch({ wordTimeLeft: wordLeft, turnTimeLeft: turnLeft, turnExpired });
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- setup ----

  const setMode = useCallback((mode: Mode) => {
    const teamCount = mode === 'practice' ? 1 : stateRef.current.teamCount;
    const perTeam = stateRef.current.draft[0]?.players.length ?? 2;
    // Practice mode uses the time limit only (spec §3) — force it here so a
    // leftover points/rounds selection from a previous mode choice can't
    // leak into the win-condition screen behind a hidden type selector.
    const winOverrides = mode === 'practice' ? { winType: 'time' as const, winValue: 15 } : {};
    patch({ mode, teamCount, draft: buildDraft(teamCount, perTeam), screen: 'setupTeams', ...winOverrides });
  }, [patch]);

  const setTeamCount = useCallback((n: number) => {
    const s = stateRef.current;
    const draft = buildDraft(n, s.draft[0]?.players.length ?? 2).map((t, i) => (s.draft[i] ? { ...t, players: s.draft[i].players } : t));
    patch({ teamCount: n, draft, winValue: s.winType === 'rounds' ? nearestMultiple(s.winValue, n) : s.winValue });
  }, [patch]);

  const addPlayer = useCallback((teamIdx: number) => {
    const s = stateRef.current;
    const used = new Set(s.draft.flatMap((t) => t.players));
    const next = NAME_POOL.find((n) => !used.has(n)) ?? 'Player';
    const draft = s.draft.map((t, i) => (i === teamIdx ? { ...t, players: [...t.players, next] } : t));
    patch({ draft });
  }, [patch]);

  const removePlayer = useCallback((teamIdx: number, playerIdx: number) => {
    const s = stateRef.current;
    const draft = s.draft.map((t, i) => (i === teamIdx ? { ...t, players: t.players.filter((_, pi) => pi !== playerIdx) } : t));
    patch({ draft });
  }, [patch]);

  const renamePlayer = useCallback((teamIdx: number, playerIdx: number, name: string) => {
    const s = stateRef.current;
    const draft = s.draft.map((t, i) => (i === teamIdx ? { ...t, players: t.players.map((p, pi) => (pi === playerIdx ? name : p)) } : t));
    patch({ draft });
  }, [patch]);

  const movePlayer = useCallback((fromTeamIdx: number, playerIdx: number, toTeamIdx: number) => {
    const s = stateRef.current;
    if (fromTeamIdx === toTeamIdx) return;
    const name = s.draft[fromTeamIdx].players[playerIdx];
    const draft = s.draft.map((t, i) => {
      if (i === fromTeamIdx) return { ...t, players: t.players.filter((_, pi) => pi !== playerIdx) };
      if (i === toTeamIdx) return { ...t, players: [...t.players, name] };
      return t;
    });
    patch({ draft });
  }, [patch]);

  const setTurnSeconds = useCallback((n: number) => patch({ turnSeconds: n, turnTimeLeft: n }), [patch]);

  const setWinType = useCallback((winType: WinType) => {
    const s = stateRef.current;
    const winValue = winType === 'time' ? 15 : winType === 'points' ? 30 : nearestMultiple(4, s.teamCount);
    patch({ winType, winValue });
  }, [patch]);

  const setWinValue = useCallback((v: number) => patch({ winValue: v }), [patch]);

  const backTo = useCallback((screen: GameState['screen']) => patch({ screen }), [patch]);

  const startGame = useCallback(async () => {
    const s = stateRef.current;
    if (!s.mode) return;
    patch({ loadingWord: true });
    try {
      const gameId = await createGame(s.mode, s.turnSeconds, s.winType, s.winValue);
      const maxPlayers = Math.max(...s.draft.map((t) => t.players.length));
      const teams: Team[] = [];
      for (let i = 0; i < s.draft.length; i++) {
        const dt = s.draft[i];
        const gameTeamId = await createGameTeam(gameId, i, dt.name, dt.color, maxPlayers);
        const players: Team['players'] = [];
        for (let pi = 0; pi < dt.players.length; pi++) {
          const playerId = await upsertPlayer(dt.players[pi]);
          await createGamePlayer(gameId, gameTeamId, playerId, pi);
          players.push({ name: dt.players[pi], playerId });
        }
        teams.push({ gameTeamId, teamIndex: i, name: dt.name, color: dt.color, players, playerIdx: 0, score: 0, totalTokens: maxPlayers, tokensSpent: 0 });
      }
      let bestScore: number | null = null;
      if (s.mode === 'practice' || s.mode === 'collaborative') {
        bestScore = await fetchBestScore(s.mode, s.turnSeconds, s.winType, s.winValue);
      }
      patch({
        gameId,
        teams,
        currentTeamIdx: 0,
        screen: 'handover',
        turnTimeLeft: s.turnSeconds,
        totalTurnsPlayed: 0,
        collaborativeScore: 0,
        gameStartedAt: Date.now(),
        bestScore,
        loadingWord: false,
      });
    } catch (e) {
      console.error(e);
      patch({ loadingWord: false });
    }
  }, [patch]);

  // ---- turn flow ----

  const goToWheel = useCallback(() => patch({ screen: 'wheel' }), [patch]);

  const spinWheel = useCallback(() => {
    const s = stateRef.current;
    if (s.wheelSpinning) return;
    const idx = Math.floor(Math.random() * CATEGORIES.length);
    const seg = 360 / CATEGORIES.length;
    const jitter = (Math.random() - 0.5) * (seg * 0.5);
    const target = s.wheelRotationDeg + 5 * 360 + (360 - idx * seg) + jitter;
    patch({ wheelSpinning: true, wheelRotationDeg: target });
    setTimeout(() => {
      patch({ wheelSpinning: false, categoryKey: CATEGORIES[idx].key, screen: 'token' });
    }, 2900);
  }, [patch]);

  const spendToken = useCallback(() => {
    const s = stateRef.current;
    const team = s.teams[s.currentTeamIdx];
    if (team.tokensSpent >= team.totalTokens) return;
    const teams = s.teams.slice();
    teams[s.currentTeamIdx] = { ...team, tokensSpent: team.tokensSpent + 1 };
    patch({ teams, tokenSpentThisTurn: true, showTokenAnnouncement: true });
    playTokenSpent(s.muted);
    setTimeout(() => {
      patch({ showTokenAnnouncement: false });
      void startPlay();
    }, 1600);
  }, [patch]);

  const declineToken = useCallback(() => void startPlay(), []);

  const startPlay = useCallback(async () => {
    const s = stateRef.current;
    patch({
      turnTimeLeft: s.turnSeconds,
      turnWords: [],
      turnWordCount: 0,
      allplayCountThisTurn: 0,
      allplayPlan: s.mode === 'competitive' && s.teams.length > 1 ? planAllplay() : null,
    });
    await drawNextWord(true);
  }, [patch]);

  const drawNextWord = useCallback(async (first: boolean) => {
    const s = stateRef.current;
    if (!s.categoryKey) return;
    patch({ loadingWord: true });
    const count = first ? 0 : s.turnWordCount;

    const allplayCheck = checkAllplay({
      mode: s.mode!,
      teamCount: s.teams.length,
      turnWordCount: count,
      turnTimeLeft: s.turnTimeLeft,
      turnSeconds: s.turnSeconds,
      turnExpired: s.turnExpired,
      allplayCountThisTurn: s.allplayCountThisTurn,
      plan: s.allplayPlan,
    });

    let drawn;
    try {
      drawn = await drawNext(s.categoryKey);
    } catch (e) {
      console.error(e);
      patch({ loadingWord: false });
      return;
    }

    const isSong = drawn.kind === 'song';
    const willAllplay = allplayCheck.isAllplay && !isSong;

    if (willAllplay) {
      patch({ allplayPlan: allplayCheck.updatedPlan, showAllplayAnnouncement: true, turnWordCount: count + 1, loadingWord: false, currentWord: drawn });
      setTimeout(() => {
        patch((prev) => ({
          showAllplayAnnouncement: false,
          screen: 'allplay',
          wordTimeLimit: 10,
          wordTimeLeft: 10,
          allplayCountThisTurn: prev.allplayCountThisTurn + 1,
        }));
      }, 1200);
      return;
    }

    patch({
      allplayPlan: allplayCheck.updatedPlan,
      currentWord: drawn,
      turnWordCount: count + 1,
      screen: isSong ? 'song' : 'play',
      songPaused: isSong,
      wordTimeLimit: 15,
      wordTimeLeft: 15,
      loadingWord: false,
    });
  }, [patch]);

  const resolveWord = useCallback(async (outcome: TurnWordEntry['outcome'], scoredTeamIdx?: number) => {
    const s = stateRef.current;
    if (!s.currentWord) return;
    const doubled = s.tokenSpentThisTurn;
    const wasAllplay = s.screen === 'allplay';
    const targetIdx = scoredTeamIdx ?? s.currentTeamIdx;
    const wasCorrect = outcome === 'correct';
    const mult = doubled ? 2 : 1;
    const delta = (wasCorrect ? 1 : -1) * mult;

    const teams = s.teams.slice();
    teams[targetIdx] = { ...teams[targetIdx], score: teams[targetIdx].score + delta };
    const collaborativeScore = s.mode === 'collaborative' ? s.collaborativeScore + delta : s.collaborativeScore;

    const cw = s.currentWord;
    const text = cw.kind === 'song' ? `${cw.title} — ${cw.artist}` : cw.text;

    if (wasCorrect) playCorrect(s.muted);
    else playSkip(s.muted);

    patch({ teams, collaborativeScore, songPaused: false });

    const describer = s.teams[s.currentTeamIdx].players[s.teams[s.currentTeamIdx].playerIdx];
    let turnEventId: string | null = null;
    try {
      turnEventId = await logTurnEvent({
        gameId: s.gameId!,
        describingTeamId: s.teams[s.currentTeamIdx].gameTeamId,
        describingPlayerId: describer.playerId,
        turnIndex: s.totalTurnsPlayed,
        category: s.categoryKey!,
        wordId: cw.kind === 'word' ? cw.id : null,
        songId: cw.kind === 'song' ? cw.id : null,
        outcome,
        doubled,
        isAllplay: wasAllplay,
        scoredTeamId: wasCorrect ? teams[targetIdx].gameTeamId : null,
      });
    } catch (e) {
      console.error(e);
    }

    const entry: TurnWordEntry = {
      turnEventId,
      text,
      outcome,
      doubled,
      isAllplay: wasAllplay,
      flagged: false,
      scoredTeamIdx: wasCorrect ? targetIdx : null,
      category: s.categoryKey!,
      wordId: cw.kind === 'word' ? cw.id : null,
      songId: cw.kind === 'song' ? cw.id : null,
    };
    patch((prev) => ({ turnWords: [...prev.turnWords, entry] }));
    if (wasAllplay) patch({ screen: 'play' });

    if (stateRef.current.turnExpired) {
      patch({ screen: 'summary' });
    } else {
      await drawNextWord(false);
    }
  }, [patch, drawNextWord]);

  const handleGotIt = useCallback(() => void resolveWord('correct'), [resolveWord]);
  const handleSkip = useCallback(() => void resolveWord('skip'), [resolveWord]);
  const handleAllplayCorrect = useCallback((teamIdx: number) => void resolveWord('correct', teamIdx), [resolveWord]);

  const toggleFlag = useCallback(async (index: number) => {
    const s = stateRef.current;
    const words = s.turnWords.slice();
    const w = { ...words[index] };
    if (w.scoredTeamIdx === null) return;
    const mag = w.doubled ? 2 : 1;
    const delta = w.flagged ? 2 * mag : -2 * mag;
    const teams = s.teams.slice();
    teams[w.scoredTeamIdx] = { ...teams[w.scoredTeamIdx], score: teams[w.scoredTeamIdx].score + delta };
    const collaborativeScore = s.mode === 'collaborative' ? s.collaborativeScore + delta : s.collaborativeScore;
    w.flagged = !w.flagged;
    words[index] = w;
    patch({ teams, collaborativeScore, turnWords: words });
    if (w.turnEventId) {
      try {
        await setTurnEventFlag(w.turnEventId, w.flagged);
      } catch (e) {
        console.error(e);
      }
    }
  }, [patch]);

  const confirmSummary = useCallback(async () => {
    const s = stateRef.current;
    const totalTurnsPlayed = s.totalTurnsPlayed + 1;
    patch({ screen: 'scoreboard', totalTurnsPlayed });

    const over = isGameOver({ ...s, totalTurnsPlayed });
    if (over && s.gameId) {
      try {
        await finishGame(s.gameId, s.teams.map((t) => ({ gameTeamId: t.gameTeamId, score: t.score })));
        if (s.mode === 'practice' || s.mode === 'collaborative') {
          const finalScore = s.mode === 'collaborative' ? stateRef.current.collaborativeScore : s.teams[0].score;
          await recordBestScoreIfHigher(s.mode, s.turnSeconds, s.winType, s.winValue, finalScore, s.gameId);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [patch]);

  const nextTurn = useCallback(() => {
    const s = stateRef.current;
    if (isGameOver(s)) {
      patch({ ...initialState(), muted: s.muted });
      return;
    }
    const nextIdx = (s.currentTeamIdx + 1) % s.teams.length;
    const teams = s.teams.slice();
    teams[nextIdx] = { ...teams[nextIdx], playerIdx: (teams[nextIdx].playerIdx + 1) % teams[nextIdx].players.length };
    patch({
      teams,
      currentTeamIdx: nextIdx,
      screen: 'handover',
      categoryKey: null,
      tokenSpentThisTurn: false,
      turnWords: [],
      turnWordCount: 0,
      currentWord: null,
      turnTimeLeft: s.turnSeconds,
      turnExpired: false,
      wheelRotationDeg: s.wheelRotationDeg % 360,
      allplayCountThisTurn: 0,
      allplayPlan: null,
    });
  }, [patch]);

  const toggleMuted = useCallback(() => patch((prev) => ({ muted: !prev.muted })), [patch]);

  const gameOver = isGameOver(state);
  const conditionMet = winConditionMet(state);

  return {
    state,
    gameOver,
    conditionMet,
    setMode,
    setTeamCount,
    addPlayer,
    removePlayer,
    renamePlayer,
    movePlayer,
    setTurnSeconds,
    setWinType,
    setWinValue,
    backTo,
    startGame,
    goToWheel,
    spinWheel,
    spendToken,
    declineToken,
    handleGotIt,
    handleSkip,
    handleAllplayCorrect,
    toggleFlag,
    confirmSummary,
    nextTurn,
    toggleMuted,
  };
}

function nearestMultiple(value: number, base: number): number {
  if (base <= 0) return value;
  return Math.max(base, Math.round(value / base) * base);
}

export type UseGameReturn = ReturnType<typeof useGame>;
export type { CategoryKey };
