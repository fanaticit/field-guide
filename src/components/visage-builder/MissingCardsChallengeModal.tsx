// ─────────────────────────────────────────────────────────────
// MissingCardsChallengeModal — after saving a set that uses cards the
// hunter doesn't own, offers to add them to their Personal Hunter's Challenge.
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { FolderKanban, Loader2, X } from 'lucide-react';
import type { ChallengeProject } from '../../hooks/useChallengeProjects';
import { getInkConfig } from '../../data/schemas/visage';
import type { MissingCard } from '../../lib/visageBuild';
import { InkIconComponent } from '../../pages/investigation-notes/VisageCard';
import { cn } from '../../lib/utils';

interface Props {
  open: boolean;
  missing: MissingCard[];
  adding: boolean;
  error: string | null;
  /** The hunter's projects, so the cards can go straight into one */
  projects?: ChallengeProject[];
  onConfirm: (target: { projectId: string | null; newProjectName: string | null }) => void;
  onDecline: () => void;
}

const NEW_PROJECT = '__new__';

export default function MissingCardsChallengeModal({ open, missing, adding, error, projects = [], onConfirm, onDecline }: Props) {
  const [projectChoice, setProjectChoice] = useState('');
  const [newName, setNewName] = useState('');
  if (!open || missing.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={adding ? undefined : onDecline}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="mho-panel-deep w-full max-w-md border-[var(--border-active)] p-5 shadow-2xl space-y-4"
        style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 24px var(--accent-gold-glow)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/img/ui/Challenge%20Icon.png"
              alt=""
              draggable={false}
              className="h-9 w-9 shrink-0 object-contain"
            />
            <h3 className="font-display text-base font-bold text-[#FFD700]">Add to Personal Hunter's Challenge?</h3>
          </div>
          <button
            type="button"
            onClick={onDecline}
            disabled={adding}
            className="text-[var(--text-secondary)] hover:text-white disabled:opacity-40"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Your set uses {missing.length === 1 ? 'a card' : `${missing.length} cards`} you don't own yet. Shall we add{' '}
          {missing.length === 1 ? 'it' : 'them'} to your Personal Hunter's Challenge so you can hunt{' '}
          {missing.length === 1 ? 'it' : 'them'} down?
        </p>

        <ul className="max-h-56 overflow-y-auto space-y-1.5">
          {missing.map((m) => {
            const cfg = getInkConfig(m.ink);
            return (
              <li
                key={`${m.visage.id}:${m.ink}`}
                className="flex items-center gap-2.5 rounded-lg border border-[var(--border-subtle)] bg-white/5 px-2.5 py-1.5"
              >
                <div className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md border', cfg.bg, cfg.border, cfg.text)}>
                  <InkIconComponent iconName={cfg.iconName} size={13} />
                </div>
                <span className="flex-1 truncate text-xs font-bold text-white">{m.visage.name}</span>
                <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                  {m.owned}/{m.needed} owned
                </span>
              </li>
            );
          })}
        </ul>

        {/* Optional: put the cards in a project too */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
            <FolderKanban size={13} className="shrink-0 text-sky-400" />
            <span className="shrink-0">Project</span>
            <select
              value={projectChoice}
              onChange={(e) => setProjectChoice(e.target.value)}
              disabled={adding}
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/50 px-2 py-1 text-xs text-white"
            >
              <option value="">No project — just Challenges</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              <option value={NEW_PROJECT}>+ New project…</option>
            </select>
          </label>
          {projectChoice === NEW_PROJECT && (
            <input
              autoFocus
              value={newName}
              maxLength={60}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New project name"
              className="w-full rounded-lg border border-white/15 bg-black/50 px-2 py-1 text-xs text-white placeholder:text-sky-700"
            />
          )}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onDecline}
            disabled={adding}
            className="rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-white disabled:opacity-40"
          >
            No thanks
          </button>
          <button
            type="button"
            onClick={() => onConfirm({
              projectId: projectChoice && projectChoice !== NEW_PROJECT ? projectChoice : null,
              newProjectName: projectChoice === NEW_PROJECT ? newName.trim() || 'New project' : null,
            })}
            disabled={adding}
            className="btn-mho-gold !px-4 !py-1.5 disabled:opacity-50"
          >
            {adding && <Loader2 size={14} className="animate-spin" />}
            <span>Add to Challenges</span>
          </button>
        </div>
      </div>
    </div>
  );
}
