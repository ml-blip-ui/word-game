import { useCallback, useEffect, useRef, useState } from 'react';
import type { CategoryKey } from './categories';
import { CATEGORIES, TEAM_COLORS } from './categories';
import type { DraftTeam, GameState, Mode, Team, TurnWordEntry, WinType } from './types';
import { drawNext } from './wordDraw';
import { planAllplay, checkAllplay } from './allplay';
import { isGameOver } from './winConditions';
import { playCorrect, playSkip, playTokenSpent, playTurnExpired } from './sound';
import {
  createGame,
  createGamePlayer,
  createGameTeam,
  fetchBestScore,
  fetchGroupLastTeams,
  finishGame,
  logTurnEvent,
  recordBestScoreIfHigher,
  reportWord,
  saveGroupLastTeams,
  setTurnEventFlag,
  unreportWord,
  upsertPlayer,
  type GroupRoster,
} from './persistence';

// Teams start with blank entries, not placeholder names — a fake "Sarah"
// sitting in an input reads as pre-filled data rather than a prompt to type.
function buildDraft(teamCount: number, perTeam: number): DraftTeam[] {
  return Array.from({ length: teamCount }, (_, ti) => ({
    name: `Team ${ti + 1}`,
    color: TEAM_COLORS[ti % TEAM_COLORS.length],
    players: Array.from({ length: perTeam }, () => ''),
  }));
}

// Round-robins a group's roster into teamCount teams, unless a preset split
// (the group's last-used teams, id-based) still matches that team count.
function buildDraftFromRoster(teamCount: number, roster: { id: string; name: string }[], preset?: string[][] | null): DraftTeam[] {
  if (preset && preset.length === teamCount) {
    const byId = new Map(roster.map((m) => [m.id, m.name]));
    return preset.map((ids, ti) => ({
      name: `Team ${ti + 1}`,
      color: TEAM_COLORS[ti % TEAM_COLORS.length],
      players: ids.map((id) => byId.get(id)).filter((n): n is string => !!n),
    }));
  }
  const teams: DraftTeam[] = Array.from({ length: teamCount }, (_, ti) => ({
    name: `Team ${ti + 1}`,
    color: TEAM_COLORS[ti % TEAM_COLORS.length],
    players: [],
  }));
  roster.forEach((m, i) => teams[i % teamCount].players.push(m.name));
  return teams;
}

function initialState(): GameState {
  return {
    screen: 'title',
    mode: null,
    teamCount: 2,
    draft: buildDraft(2, 2),
    activeGroupId: null,
    groupRoster: null,
    turnSeconds: 90,
    winType: 'time',
    winValue: 15,
    gameId: null,
    teams: [],
    currentTeamIdx: 0,
    totalTurnsPlayed: 0,
    collaborativeScore: 0,
    gameStartedAt: null,
    endedEarly: false,
    gameFinished: false,
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
    allplayWordsInOccurrence: 0,
    allplayOccurrencesDone: 0,
    allplayPlan: null,
    currentWord: null,
    songPaused: false,
    muted: false,
    loadingWord: false,
    error: null,
    bestScore: null,
  };
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  // Supabase/PostgREST errors are plain objects with a `message` property,
  // not instances of Error — String(obj) on those just gives "[object Object]".
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return String(e);
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
      // Both clocks freeze during the ALL PLAY announcement flash — the
      // screen underneath is stale (the new word isn't revealed yet), and
      // letting the previous word's last seconds run out here would
      // auto-skip the new word before anyone has seen it.
      if ((s.screen === 'play' || s.screen === 'allplay') && !s.songPaused && !s.showAllplayAnnouncement) {
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

  const goToChooseGroup = useCallback(() => patch({ screen: 'chooseGroup' }), [patch]);

  const pickGroup = useCallback(async (group: GroupRoster) => {
    patch({ activeGroupId: group.id, groupRoster: group.members });
    let teamCount = 2;
    let draft = buildDraftFromRoster(2, group.members);
    try {
      const last = await fetchGroupLastTeams(group.id);
      if (last) {
        teamCount = last.teamCount;
        draft = buildDraftFromRoster(teamCount, group.members, last.teams);
      }
    } catch (e) {
      console.error(e);
    }
    patch({ teamCount, draft, screen: 'mode' });
  }, [patch]);

  const skipGroup = useCallback(() => {
    patch({ activeGroupId: null, groupRoster: null, teamCount: 2, draft: buildDraft(2, 2), screen: 'mode' });
  }, [patch]);

  const setMode = useCallback((mode: Mode) => {
    const s = stateRef.current;
    // Practice mode uses the time limit only (spec §3) — force it here so a
    // leftover points/rounds selection from a previous mode choice can't
    // leak into the win-condition screen behind a hidden type selector.
    const winOverrides = mode === 'practice' ? { winType: 'time' as const, winValue: 15 } : {};

    if (s.groupRoster) {
      // Changing mode shouldn't reshuffle an already-chosen team split —
      // practice is the one case that forces a shape change (everyone on
      // one team).
      if (mode === 'practice') {
        patch({ mode, teamCount: 1, draft: buildDraftFromRoster(1, s.groupRoster), screen: 'setupTeams', ...winOverrides });
        return;
      }
      const teamCount = s.teamCount > 1 ? s.teamCount : 2;
      const draft = s.draft.length === teamCount ? s.draft : buildDraftFromRoster(teamCount, s.groupRoster);
      patch({ mode, teamCount, draft, screen: 'setupTeams', ...winOverrides });
      return;
    }

    const teamCount = mode === 'practice' ? 1 : s.teamCount;
    const perTeam = s.draft[0]?.players.length ?? 2;
    patch({ mode, teamCount, draft: buildDraft(teamCount, perTeam), screen: 'setupTeams', ...winOverrides });
  }, [patch]);

  const setTeamCount = useCallback((n: number) => {
    const s = stateRef.current;
    const draft = s.groupRoster
      ? buildDraftFromRoster(n, s.groupRoster)
      : buildDraft(n, s.draft[0]?.players.length ?? 2).map((t, i) => (s.draft[i] ? { ...t, players: s.draft[i].players } : t));
    patch({ teamCount: n, draft, winValue: s.winType === 'rounds' ? snapRoundCount(s.winValue, n) : s.winValue });
  }, [patch]);

  const addPlayer = useCallback((teamIdx: number) => {
    const s = stateRef.current;
    const draft = s.draft.map((t, i) => (i === teamIdx ? { ...t, players: [...t.players, ''] } : t));
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
    const winValue = winType === 'time' ? 15 : winType === 'points' ? 30 : s.teamCount * 2;
    patch({ winType, winValue });
  }, [patch]);

  const setWinValue = useCallback((v: number) => patch({ winValue: v }), [patch]);

  const backTo = useCallback((screen: GameState['screen']) => patch({ screen }), [patch]);

  const startGame = useCallback(async () => {
    const s = stateRef.current;
    if (!s.mode) return;
    patch({ loadingWord: true, error: null });
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
      if (s.activeGroupId) {
        try {
          await saveGroupLastTeams(s.activeGroupId, teams.map((t) => t.players.map((p) => p.playerId)));
        } catch (e) {
          console.error(e);
        }
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
      patch({ loadingWord: false, error: `Couldn't start the game: ${errorMessage(e)}` });
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
    // The disc's resting angle carries over between turns (nextTurn keeps
    // rotation % 360 so the wheel doesn't visibly snap back), so the target
    // must be computed relative to where the disc actually is. Adding a
    // fixed "360 - idx*seg" to a non-zero starting angle — as the handoff
    // prototype did — landed the pointer on the wrong segment from the
    // second spin of a game onward: the wheel showed one category while the
    // game played another.
    const currentMod = ((s.wheelRotationDeg % 360) + 360) % 360;
    const desired = (((360 - idx * seg + jitter) % 360) + 360) % 360;
    const delta = (((desired - currentMod) % 360) + 360) % 360;
    const target = s.wheelRotationDeg + 5 * 360 + delta;
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
      allplayWordsInOccurrence: 0,
      allplayOccurrencesDone: 0,
      allplayPlan: s.mode === 'competitive' && s.teams.length > 1 ? planAllplay() : null,
    });
    await drawNextWord(true);
  }, [patch]);

  const drawNextWord = useCallback(async (first: boolean) => {
    const s = stateRef.current;
    if (!s.categoryKey) return;
    // Normal flow never reaches here after expiry (resolveWord routes to
    // the summary first); this only trips if a failed draw's retry lands
    // after the turn timer has run out mid-retry.
    if (s.turnExpired) {
      patch({ screen: 'summary', loadingWord: false });
      return;
    }
    patch({ loadingWord: true });
    const count = first ? 0 : s.turnWordCount;

    // A skipped all-play word chains straight into another all-play word
    // (spec §8), so while an occurrence is open, checkAllplay isn't
    // consulted — the next word is an all-play by continuation.
    const continuingAllplay = s.allplayWordsInOccurrence > 0;
    const allplayCheck = continuingAllplay
      ? { isAllplay: false, updatedPlan: s.allplayPlan }
      : checkAllplay({
          mode: s.mode!,
          teamCount: s.teams.length,
          turnWordCount: count,
          turnTimeLeft: s.turnTimeLeft,
          turnSeconds: s.turnSeconds,
          turnExpired: s.turnExpired,
          occurrencesDone: s.allplayOccurrencesDone,
          plan: s.allplayPlan,
        });

    let drawn;
    try {
      drawn = await drawNext(s.categoryKey);
    } catch (e) {
      console.error(e);
      // Keep loadingWord true so the stale word on screen can't be
      // resolved a second time, and retry until the network comes back or
      // the player leaves the play flow.
      patch({ error: `Couldn't get the next word: ${errorMessage(e)} — retrying…` });
      setTimeout(() => {
        const cur = stateRef.current;
        if ((cur.screen === 'token' || cur.screen === 'play' || cur.screen === 'song' || cur.screen === 'allplay') && !cur.showAllplayAnnouncement) {
          void drawNextWord(first);
        }
      }, 2000);
      return;
    }

    const isSong = drawn.kind === 'song';

    if (continuingAllplay) {
      if (isSong) {
        // A song can't be an all-play (its clock is paused, and the steal
        // buttons make no sense against "title and artist"). Rare — only
        // possible on a Random turn. End the occurrence and serve the song
        // normally rather than skipping it back into the pool.
        patch({
          allplayWordsInOccurrence: 0,
          allplayOccurrencesDone: s.allplayOccurrencesDone + 1,
          currentWord: drawn,
          turnWordCount: count + 1,
          screen: 'song',
          songPaused: true,
          wordTimeLimit: 15,
          wordTimeLeft: 15,
          loadingWord: false,
          error: null,
        });
        return;
      }
      // Second word of the occurrence: straight in, no announcement.
      patch({
        currentWord: drawn,
        turnWordCount: count + 1,
        screen: 'allplay',
        allplayWordsInOccurrence: s.allplayWordsInOccurrence + 1,
        wordTimeLimit: 10,
        wordTimeLeft: 10,
        loadingWord: false,
        error: null,
      });
      return;
    }

    const willAllplay = allplayCheck.isAllplay && !isSong;

    if (willAllplay) {
      // The word timer is set to 10 immediately, not when the announcement
      // clears — the tick is frozen during the flash, and the reveal must
      // never inherit the previous word's dying seconds.
      patch({
        allplayPlan: allplayCheck.updatedPlan,
        showAllplayAnnouncement: true,
        currentWord: drawn,
        turnWordCount: count + 1,
        allplayWordsInOccurrence: 1,
        wordTimeLimit: 10,
        wordTimeLeft: 10,
        loadingWord: false,
        error: null,
      });
      setTimeout(() => {
        patch({ showAllplayAnnouncement: false, screen: 'allplay' });
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
      error: null,
    });
  }, [patch]);

  const resolveWord = useCallback(async (outcome: TurnWordEntry['outcome'], scoredTeamIdx?: number) => {
    const s = stateRef.current;
    // loadingWord doubles as an in-flight lock: between resolving a word
    // and the next one appearing there's a network round-trip during which
    // the old word is still on screen with live buttons. Without this, an
    // impatient double-tap scores the same word twice and logs it twice.
    if (!s.currentWord || s.loadingWord) return;
    patch({ loadingWord: true });
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
      reported: false,
      reportId: null,
      scoredTeamIdx: wasCorrect ? targetIdx : null,
      category: s.categoryKey!,
      sourceCategory: cw.kind === 'word' ? cw.category : null,
      wordId: cw.kind === 'word' ? cw.id : null,
      songId: cw.kind === 'song' ? cw.id : null,
    };
    patch((prev) => ({ turnWords: [...prev.turnWords, entry] }));

    if (wasAllplay) {
      // The occurrence ends when the word is guessed, or after two failed
      // words (spec §8's cap). A failed first word keeps the occurrence
      // open, and the next draw chains into another all-play word.
      const occurrenceEnds = wasCorrect || s.allplayWordsInOccurrence >= 2;
      if (occurrenceEnds) {
        patch({ allplayWordsInOccurrence: 0, allplayOccurrencesDone: s.allplayOccurrencesDone + 1, screen: 'play' });
      }
    }

    if (stateRef.current.turnExpired) {
      patch({ screen: 'summary', loadingWord: false, allplayWordsInOccurrence: 0 });
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

  // Report a word as impossible/too obscure. Available on every row
  // regardless of outcome — an auto-skipped word is the likeliest candidate
  // — and has no effect on the score.
  const toggleReport = useCallback(async (index: number) => {
    const s = stateRef.current;
    const w = { ...s.turnWords[index] };
    if (!w.wordId && !w.songId) return;

    const wasReported = w.reported;
    const words = s.turnWords.slice();
    // Flip optimistically so the tap feels instant, then reconcile.
    words[index] = { ...w, reported: !wasReported };
    patch({ turnWords: words });

    try {
      if (wasReported) {
        if (w.reportId) await unreportWord(w.reportId);
        patch((prev) => {
          const next = prev.turnWords.slice();
          next[index] = { ...next[index], reported: false, reportId: null };
          return { turnWords: next };
        });
      } else {
        const reportId = await reportWord({ wordId: w.wordId, songId: w.songId, gameId: s.gameId });
        patch((prev) => {
          const next = prev.turnWords.slice();
          next[index] = { ...next[index], reported: true, reportId };
          return { turnWords: next };
        });
      }
    } catch (e) {
      console.error(e);
      patch((prev) => {
        const next = prev.turnWords.slice();
        next[index] = { ...next[index], reported: wasReported };
        return { turnWords: next, error: `Couldn't save that report: ${errorMessage(e)}` };
      });
    }
  }, [patch]);

  const confirmSummary = useCallback(async () => {
    const s = stateRef.current;
    const totalTurnsPlayed = s.totalTurnsPlayed + 1;
    // The win condition is evaluated exactly once, here — the post-turn
    // checkpoint. Evaluating it live (e.g. again in nextTurn) meant a
    // time-limit crossing while the scoreboard sat on screen could flip
    // what the "Next turn" button did between render and press.
    const over = isGameOver({ ...s, totalTurnsPlayed });
    patch({ screen: 'scoreboard', totalTurnsPlayed, gameFinished: over });

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

  // Calling it quits mid-game. The scores stand and are written to the
  // database as a finished game, but no best score is recorded: best scores
  // are keyed to the settings that produced them, and a game abandoned
  // halfway through those settings isn't a fair comparison against one
  // played out in full.
  const endGameEarly = useCallback(async () => {
    const s = stateRef.current;
    patch({ endedEarly: true, screen: 'scoreboard' });
    if (!s.gameId) return;
    try {
      await finishGame(s.gameId, s.teams.map((t) => ({ gameTeamId: t.gameTeamId, score: t.score })));
    } catch (e) {
      console.error(e);
    }
  }, [patch]);

  const nextTurn = useCallback(() => {
    const s = stateRef.current;
    if (s.gameFinished || s.endedEarly) {
      patch({ ...initialState(), muted: s.muted, screen: 'chooseGroup' });
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
      allplayWordsInOccurrence: 0,
      allplayOccurrencesDone: 0,
      allplayPlan: null,
      loadingWord: false,
    });
  }, [patch]);

  const toggleMuted = useCallback(() => patch((prev) => ({ muted: !prev.muted })), [patch]);

  const gameOver = state.gameFinished || state.endedEarly;

  return {
    state,
    gameOver,
    goToChooseGroup,
    pickGroup,
    skipGroup,
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
    toggleReport,
    confirmSummary,
    endGameEarly,
    nextTurn,
    toggleMuted,
    dismissError: () => patch({ error: null }),
  };
}

// The win-condition screen offers round counts of teams × 2/4/6/8, so a
// carried-over value must snap to one of those four — not merely to any
// multiple of the team count, which could land between the options and
// leave nothing visibly selected.
function snapRoundCount(value: number, teams: number): number {
  if (teams <= 0) return value;
  const step = teams * 2;
  const k = Math.min(4, Math.max(1, Math.round(value / step)));
  return step * k;
}

export type UseGameReturn = ReturnType<typeof useGame>;
export type { CategoryKey };
