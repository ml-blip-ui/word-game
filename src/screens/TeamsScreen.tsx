import { useEffect, useState } from 'react';
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import type { DraftTeam } from '../lib/types';
import { fetchPlayerSuggestions } from '../lib/persistence';
import { Button } from '../components/Button';

interface TeamsScreenProps {
  mode: string | null;
  teamCount: number;
  draft: DraftTeam[];
  onBack: () => void;
  onSetTeamCount: (n: number) => void;
  onAddPlayer: (teamIdx: number) => void;
  onRemovePlayer: (teamIdx: number, playerIdx: number) => void;
  onRenamePlayer: (teamIdx: number, playerIdx: number, name: string) => void;
  onMovePlayer: (fromTeamIdx: number, playerIdx: number, toTeamIdx: number) => void;
  onContinue: () => void;
}

export function TeamsScreen({ mode, teamCount, draft, onBack, onSetTeamCount, onAddPlayer, onRemovePlayer, onRenamePlayer, onMovePlayer, onContinue }: TeamsScreenProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [autoFocusKey, setAutoFocusKey] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    fetchPlayerSuggestions().then(setSuggestions).catch(() => setSuggestions([]));
  }, []);

  // A team needs at least one player, and every visible name must actually
  // be typed in — an untouched blank row shouldn't silently count as "done".
  const canContinue = draft.length > 0 && draft.every((t) => t.players.length >= 1 && t.players.every((p) => p.trim() !== ''));

  const handleAddPlayer = (teamIdx: number) => {
    setAutoFocusKey(`${teamIdx}-${draft[teamIdx].players.length}`);
    onAddPlayer(teamIdx);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const from = active.data.current as { teamIdx: number; playerIdx: number } | undefined;
    const toTeamIdx = (over.data.current as { teamIdx: number } | undefined)?.teamIdx;
    if (from === undefined || toTeamIdx === undefined) return;
    if (from.teamIdx === toTeamIdx) return;
    onMovePlayer(from.teamIdx, from.playerIdx, toTeamIdx);
  };

  return (
    <div className="screen" style={{ gap: 16, padding: '30px 26px' }}>
      <button onClick={onBack} style={{ alignSelf: 'flex-start', padding: 0, border: 'none', background: 'none', fontWeight: 700, fontSize: 15, color: 'var(--ink-muted)', cursor: 'pointer' }}>
        ‹ Back
      </button>
      <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 32, color: 'var(--ink)' }}>Teams</div>

      {mode !== 'practice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <span style={labelStyle}>How many teams</span>
          <div style={{ display: 'flex', gap: 10 }}>
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => onSetTeamCount(n)}
                style={{
                  flex: 1,
                  padding: '16px 0',
                  borderRadius: '16px 12px 15px 13px',
                  border: `2.2px solid ${teamCount === n ? 'var(--rust)' : 'var(--ink)'}`,
                  background: teamCount === n ? 'var(--rust)' : 'var(--surface)',
                  color: teamCount === n ? 'var(--cream)' : 'var(--ink)',
                  fontWeight: 800,
                  fontSize: 19,
                  cursor: 'pointer',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode !== 'practice' && draft.length > 1 && (
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 13, color: 'var(--ink-muted)', marginTop: -6 }}>Drag the ⠿ handle to move a player between teams.</div>
      )}

      <datalist id="player-suggestions">
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          {draft.map((t, ti) => (
            <TeamCard
              key={ti}
              team={t}
              teamIdx={ti}
              autoFocusKey={autoFocusKey}
              onAddPlayer={handleAddPlayer}
              onRemovePlayer={onRemovePlayer}
              onRenamePlayer={onRenamePlayer}
            />
          ))}
        </div>
      </DndContext>

      <Button onClick={onContinue} disabled={!canContinue} color="var(--gradient-5)" style={{ opacity: canContinue ? 1 : 0.45 }}>
        Continue
      </Button>
    </div>
  );
}

interface TeamCardProps {
  team: DraftTeam;
  teamIdx: number;
  autoFocusKey: string | null;
  onAddPlayer: (teamIdx: number) => void;
  onRemovePlayer: (teamIdx: number, playerIdx: number) => void;
  onRenamePlayer: (teamIdx: number, playerIdx: number, name: string) => void;
}

function TeamCard({ team, teamIdx, autoFocusKey, onAddPlayer, onRemovePlayer, onRenamePlayer }: TeamCardProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `team-${teamIdx}`, data: { teamIdx } });

  return (
    <div
      ref={setNodeRef}
      style={{
        padding: '14px 16px',
        borderRadius: '18px 14px 20px 15px',
        border: `2.2px solid ${team.color}`,
        background: isOver ? `color-mix(in oklch, ${team.color} 16%, var(--surface))` : `color-mix(in oklch, ${team.color} 7%, var(--surface))`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'background 0.15s ease',
      }}
    >
      <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', color: team.color }}>{team.name}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {team.players.map((p, pi) => (
          <PlayerRow
            key={pi}
            teamIdx={teamIdx}
            playerIdx={pi}
            name={p}
            color={team.color}
            autoFocus={autoFocusKey === `${teamIdx}-${pi}`}
            onRename={onRenamePlayer}
            onRemove={onRemovePlayer}
          />
        ))}
      </div>
      <button
        onClick={() => onAddPlayer(teamIdx)}
        style={{
          alignSelf: 'flex-start',
          padding: '8px 14px',
          borderRadius: 999,
          border: `2px dashed color-mix(in oklch, ${team.color} 55%, transparent)`,
          background: 'none',
          fontFamily: 'var(--font-sans)',
          fontWeight: 700,
          fontSize: 14,
          color: team.color,
          cursor: 'pointer',
        }}
      >
        + Add player
      </button>
    </div>
  );
}

interface PlayerRowProps {
  teamIdx: number;
  playerIdx: number;
  name: string;
  color: string;
  autoFocus: boolean;
  onRename: (teamIdx: number, playerIdx: number, name: string) => void;
  onRemove: (teamIdx: number, playerIdx: number) => void;
}

function PlayerRow({ teamIdx, playerIdx, name, color, autoFocus, onRename, onRemove }: PlayerRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `pill-${teamIdx}-${playerIdx}`,
    data: { teamIdx, playerIdx },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 6px 4px 8px',
        borderRadius: '14px 10px 12px 11px',
        border: `2px solid color-mix(in oklch, ${color} 55%, var(--ink))`,
        background: isDragging ? 'var(--surface)' : `color-mix(in oklch, ${color} 12%, var(--surface))`,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 10 : 'auto',
        position: 'relative',
      }}
    >
      <span {...attributes} {...listeners} style={{ touchAction: 'none', cursor: 'grab', padding: '6px 2px', fontSize: 16, color: 'var(--ink-muted)', lineHeight: 1 }} aria-label="Drag to move between teams">
        ⠿
      </span>
      <input
        value={name}
        list="player-suggestions"
        autoFocus={autoFocus}
        placeholder="Player name"
        onChange={(e) => onRename(teamIdx, playerIdx, e.target.value)}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          background: 'none',
          outline: 'none',
          padding: '10px 4px',
          fontFamily: 'var(--font-sans)',
          fontWeight: 700,
          fontSize: 16,
          color: 'var(--ink)',
        }}
      />
      <button onClick={() => onRemove(teamIdx, playerIdx)} style={{ border: 'none', background: 'none', padding: '6px 6px', fontSize: 18, lineHeight: 1, color: 'oklch(0.5 0.02 50)', cursor: 'pointer' }}>
        ×
      </button>
    </div>
  );
}

const labelStyle = { fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--ink-muted)' };
