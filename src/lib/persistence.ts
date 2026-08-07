import { supabase } from './supabase';
import type { CategoryKey } from './categories';
import type { Mode, TurnWordEntry, WinType } from './types';

export async function fetchPlayerSuggestions(): Promise<string[]> {
  const { data, error } = await supabase.from('players').select('name').order('created_at', { ascending: false }).limit(60);
  if (error) throw error;
  return (data ?? []).map((r) => r.name);
}

export async function upsertPlayer(name: string): Promise<string> {
  const trimmed = name.trim();
  const { data: existing } = await supabase.from('players').select('id').eq('name_key', trimmed.toLowerCase()).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase.from('players').insert({ name: trimmed }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function createGame(mode: Mode, turnSeconds: number, winType: WinType, winValue: number): Promise<string> {
  const { data, error } = await supabase
    .from('games')
    .insert({ mode, turn_seconds: turnSeconds, win_type: winType, win_value: winValue })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function createGameTeam(gameId: string, teamIndex: number, name: string, color: string, totalTokens: number): Promise<string> {
  const { data, error } = await supabase
    .from('game_teams')
    .insert({ game_id: gameId, team_index: teamIndex, name, color, total_tokens: totalTokens })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function createGamePlayer(gameId: string, gameTeamId: string, playerId: string, order: number): Promise<void> {
  const { error } = await supabase.from('game_players').insert({ game_id: gameId, game_team_id: gameTeamId, player_id: playerId, player_order: order });
  if (error) throw error;
}

export interface TurnEventInput {
  gameId: string;
  describingTeamId: string;
  describingPlayerId: string;
  turnIndex: number;
  category: CategoryKey;
  wordId: string | null;
  songId: string | null;
  outcome: TurnWordEntry['outcome'];
  doubled: boolean;
  isAllplay: boolean;
  scoredTeamId: string | null;
}

export async function logTurnEvent(input: TurnEventInput): Promise<string> {
  const { data, error } = await supabase
    .from('turn_events')
    .insert({
      game_id: input.gameId,
      describing_team_id: input.describingTeamId,
      describing_player_id: input.describingPlayerId,
      turn_index: input.turnIndex,
      category: input.category,
      word_id: input.wordId,
      song_id: input.songId,
      outcome: input.outcome,
      doubled: input.doubled,
      is_allplay: input.isAllplay,
      scored_team_id: input.scoredTeamId,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function setTurnEventFlag(turnEventId: string, flagged: boolean): Promise<void> {
  const { error } = await supabase.from('turn_events').update({ flagged }).eq('id', turnEventId);
  if (error) throw error;
}

export async function finishGame(gameId: string, teamFinalScores: { gameTeamId: string; score: number }[]): Promise<void> {
  await supabase.from('games').update({ finished: true, ended_at: new Date().toISOString() }).eq('id', gameId);
  await Promise.all(teamFinalScores.map((t) => supabase.from('game_teams').update({ final_score: t.score }).eq('id', t.gameTeamId)));
}

export async function fetchBestScore(mode: Mode, turnSeconds: number, winType: WinType, winValue: number): Promise<number | null> {
  const { data, error } = await supabase
    .from('best_scores')
    .select('score')
    .eq('mode', mode)
    .eq('turn_seconds', turnSeconds)
    .eq('win_type', winType)
    .eq('win_value', winValue)
    .maybeSingle();
  if (error) throw error;
  return data?.score ?? null;
}

export async function recordBestScoreIfHigher(
  mode: Mode,
  turnSeconds: number,
  winType: WinType,
  winValue: number,
  score: number,
  gameId: string,
): Promise<boolean> {
  const current = await fetchBestScore(mode, turnSeconds, winType, winValue);
  if (current !== null && score <= current) return false;
  const { error } = await supabase
    .from('best_scores')
    .upsert(
      { mode, turn_seconds: turnSeconds, win_type: winType, win_value: winValue, score, game_id: gameId, achieved_at: new Date().toISOString() },
      { onConflict: 'mode,turn_seconds,win_type,win_value' },
    );
  if (error) throw error;
  return true;
}

// Reporting a word as impossible/obscure. Nothing to do with turn_events
// .flagged (a said-the-word slip) — this has no scoring effect and only
// feeds the curation list.
export async function reportWord(target: { wordId: string | null; songId: string | null; gameId: string | null }): Promise<string> {
  const { data, error } = await supabase
    .from('word_reports')
    .insert({ word_id: target.wordId, song_id: target.songId, game_id: target.gameId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function unreportWord(reportId: string): Promise<void> {
  const { error } = await supabase.from('word_reports').delete().eq('id', reportId);
  if (error) throw error;
}

export interface GroupMember {
  id: string;
  name: string;
}

export interface GroupRoster {
  id: string;
  name: string;
  members: GroupMember[];
}

export async function fetchGroups(): Promise<GroupRoster[]> {
  const { data, error } = await supabase.from('group_rosters').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as GroupRoster[];
}

export async function createGroup(name: string, memberNames: string[]): Promise<GroupRoster> {
  const trimmed = name.trim();
  const { data: group, error } = await supabase.from('groups').insert({ name: trimmed }).select('id, name').single();
  if (error) throw error;
  const members: GroupMember[] = [];
  for (let i = 0; i < memberNames.length; i++) {
    const playerId = await upsertPlayer(memberNames[i]);
    const { error: memberError } = await supabase.from('group_members').insert({ group_id: group.id, player_id: playerId, member_order: i });
    if (memberError) throw memberError;
    members.push({ id: playerId, name: memberNames[i].trim() });
  }
  return { id: group.id, name: group.name, members };
}

export interface GroupLastTeams {
  teamCount: number;
  teams: string[][]; // player_id per team
}

export async function fetchGroupLastTeams(groupId: string): Promise<GroupLastTeams | null> {
  const { data, error } = await supabase.from('group_last_teams').select('team_count, teams').eq('group_id', groupId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { teamCount: data.team_count, teams: data.teams as string[][] };
}

export async function saveGroupLastTeams(groupId: string, teams: string[][]): Promise<void> {
  const { error } = await supabase
    .from('group_last_teams')
    .upsert({ group_id: groupId, team_count: teams.length, teams, updated_at: new Date().toISOString() }, { onConflict: 'group_id' });
  if (error) throw error;
}

export interface LeaderboardRow {
  player_id: string;
  name: string;
  correct_count: number;
  skip_count: number;
  flag_count: number;
  allplay_steals: number;
  total_points: number;
  games_played: number;
  points_by_category: Record<string, number>;
}

export async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.from('player_lifetime_stats').select('*').order('total_points', { ascending: false }).limit(50);
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}
