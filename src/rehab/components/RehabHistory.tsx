import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import {
  deleteRehabSession,
  formatDuration,
  listRehabSessions,
} from '../rehab.service'
import { formatDateTime } from '../../utils/workout'

export function RehabHistory() {
  const sessions = useLiveQuery(() => listRehabSessions(), [])
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)

  const list = (sessions ?? []).filter((s) => s.status !== 'in_progress')

  async function confirmDelete() {
    if (pendingDelete == null) return
    await deleteRehabSession(pendingDelete)
    setPendingDelete(null)
  }

  return (
    <div className="space-y-4 pb-4 pt-2">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
          Rééducation
        </p>
        <h1 className="font-display text-3xl font-semibold">Historique</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Séparé de l’historique musculation
        </p>
      </header>

      {list.length === 0 && (
        <p className="rounded-3xl bg-[var(--color-surface-elevated)] p-6 text-center text-sm text-[var(--color-ink-muted)]">
          Aucun circuit enregistré pour le moment.
        </p>
      )}

      <ul className="space-y-3">
        {list.map((session) => (
          <li
            key={session.id}
            className="rounded-3xl bg-[var(--color-surface-elevated)] p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                  {formatDateTime(session.completedAt ?? session.startedAt)}
                </p>
                <p className="mt-1 font-display text-lg font-semibold">
                  {session.circuitName}
                </p>
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                  {session.status === 'completed' ? 'Terminé' : 'Abandonné'} ·{' '}
                  {session.roundsCompleted}/{session.roundsTarget} tours
                  {session.roundsSkipped > 0
                    ? ` · ${session.roundsSkipped} ignoré(s)`
                    : ''}
                </p>
                {session.totalDurationSeconds != null && (
                  <p className="text-sm text-[var(--color-ink-muted)]">
                    Durée : {formatDuration(session.totalDurationSeconds)} ·
                    repos {session.restSecondsUsed} s
                  </p>
                )}
                {session.notes && (
                  <p className="mt-1 text-sm">Notes : {session.notes}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  session.id != null && setPendingDelete(session.id)
                }
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[var(--color-danger)]"
                aria-label="Supprimer"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Link
        to="/reeducation"
        className="inline-flex min-h-12 items-center text-sm font-semibold text-[var(--color-accent)]"
      >
        ← Retour
      </Link>

      {pendingDelete != null && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-[448px] rounded-3xl bg-[var(--color-surface-elevated)] p-5">
            <h2 className="font-display text-xl font-semibold">
              Supprimer ce circuit ?
            </h2>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              Action définitive.
            </p>
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={() => void confirmDelete()}
                className="min-h-12 rounded-2xl bg-[var(--color-danger)] font-semibold text-white"
              >
                Supprimer
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="min-h-12 rounded-2xl border border-[var(--color-line)] font-medium"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
