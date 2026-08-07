import { useEffect, useState } from 'react';
import { createGroup, fetchGroups, fetchPlayerSuggestions, type GroupRoster } from '../lib/persistence';

// A rotating accent per group card — reuses the app's existing category
// palette (not tied to actual categories here, just a nice varied set of
// on-brand colours) so each saved group is easy to tell apart at a glance.
const GROUP_ACCENTS = ['var(--cat-world)', 'var(--cat-object)', 'var(--cat-nature)', 'var(--cat-person)', 'var(--cat-action)', 'var(--cat-random)'];

interface GroupScreenProps {
  onPick: (group: GroupRoster) => void;
  onSkip: () => void;
}

export function GroupScreen({ onPick, onSkip }: GroupScreenProps) {
  const [groups, setGroups] = useState<GroupRoster[] | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMembers, setNewMembers] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups()
      .then(setGroups)
      .catch((e) => setError(String(e.message ?? e)));
    fetchPlayerSuggestions().then(setSuggestions).catch(() => setSuggestions([]));
  }, []);

  const startCreate = () => {
    setCreating(true);
    setNewName('');
    setNewMembers(['', '']);
  };

  const submitCreate = async () => {
    const name = newName.trim();
    const members = newMembers.map((m) => m.trim()).filter(Boolean);
    if (!name || members.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const group = await createGroup(name, members);
      onPick(group);
    } catch (e) {
      setError(String((e as Error).message ?? e));
      setSaving(false);
    }
  };

  if (creating) {
    return (
      <div className="screen" style={{ gap: 16, padding: '30px 26px' }}>
        <button onClick={() => setCreating(false)} style={backLinkStyle}>
          ‹ Back
        </button>
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 32, color: 'var(--ink)' }}>New group</div>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Group name — e.g. Grups and Chiddlers"
          style={inputStyle}
        />
        <datalist id="group-member-suggestions">
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <span style={labelStyle}>Members</span>
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320 }}>
            {newMembers.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 8 }}>
                <input
                  value={m}
                  list="group-member-suggestions"
                  onChange={(e) => setNewMembers(newMembers.map((v, vi) => (vi === i ? e.target.value : v)))}
                  placeholder={`Player ${i + 1}`}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() => setNewMembers(newMembers.filter((_, vi) => vi !== i))}
                  style={{ border: '2px solid oklch(0.3 0.03 50 / 0.4)', background: 'none', borderRadius: '50%', width: 44, height: 44, fontSize: 18, color: 'var(--ink-muted)', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => setNewMembers([...newMembers, ''])} style={dashedButtonStyle}>
            + Add member
          </button>
        </div>
        {error && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--rust)' }}>{error}</div>}
        <div style={{ flex: 1 }} />
        <button
          onClick={submitCreate}
          disabled={saving || !newName.trim() || newMembers.every((m) => !m.trim())}
          style={{ ...primaryButtonStyle, opacity: saving || !newName.trim() ? 0.5 : 1 }}
        >
          {saving ? 'Saving…' : 'Create group'}
        </button>
      </div>
    );
  }

  return (
    <div className="screen" style={{ gap: 16, padding: '30px 26px' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 32, color: 'var(--ink)' }}>Who's playing?</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 15, color: 'var(--ink-muted)', marginTop: -10 }}>
        Pick a saved group, or skip and enter names for just this game.
      </div>

      {error && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-muted)' }}>Couldn't load groups: {error}</div>}

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
        {groups?.length === 0 && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--ink-muted)' }}>No groups yet — create one below.</div>}
        {groups?.map((g, i) => {
          const accent = GROUP_ACCENTS[i % GROUP_ACCENTS.length];
          return (
            <button
              key={g.id}
              onClick={() => onPick(g)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 6,
                padding: '16px 18px',
                borderRadius: '18px 14px 20px 15px',
                border: `2.2px solid ${accent}`,
                background: `color-mix(in oklch, ${accent} 8%, var(--surface))`,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 20, color: accent }}>{g.name}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, color: 'var(--ink-muted)' }}>{g.members.map((m) => m.name).join(', ')}</span>
            </button>
          );
        })}
      </div>

      <button onClick={startCreate} style={dashedButtonStyle}>
        + New group
      </button>
      <button onClick={onSkip} style={{ padding: 0, border: 'none', background: 'none', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, color: 'var(--ink-muted)', cursor: 'pointer' }}>
        Skip — just for this game
      </button>
    </div>
  );
}

const backLinkStyle = { alignSelf: 'flex-start' as const, padding: 0, border: 'none', background: 'none', fontWeight: 700, fontSize: 15, color: 'var(--ink-muted)', cursor: 'pointer' as const };
const labelStyle = { fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--ink-muted)' };
const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '16px 12px 15px 13px',
  border: '2px solid oklch(0.3 0.03 50 / 0.4)',
  background: 'var(--surface)',
  fontFamily: 'var(--font-sans)',
  fontWeight: 600,
  fontSize: 16,
  color: 'var(--ink)',
  outline: 'none',
  boxSizing: 'border-box' as const,
};
const dashedButtonStyle = {
  alignSelf: 'flex-start' as const,
  padding: '10px 16px',
  borderRadius: 999,
  border: '2px dashed oklch(0.3 0.03 50 / 0.4)',
  background: 'none',
  fontFamily: 'var(--font-sans)',
  fontWeight: 700,
  fontSize: 14,
  color: 'var(--ink-muted)',
  cursor: 'pointer' as const,
};
const primaryButtonStyle = {
  padding: 19,
  borderRadius: '20px 15px 22px 16px',
  border: '2.2px solid var(--ink)',
  background: 'var(--rust)',
  color: 'var(--cream)',
  fontWeight: 800,
  fontSize: 18,
  cursor: 'pointer' as const,
};
