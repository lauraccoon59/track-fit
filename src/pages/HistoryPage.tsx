import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { db } from '../db'
import { formatDateTime, formatSetLoad } from '../utils/workout'

export function HistoryPage() {
  const sessions = useLiveQuery(
    () => db.sessions.orderBy('startedAt').reverse().toArray(),
    [],
  )
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)

  const list = (sessions ?? []).filter((s) => s.status !== 'in_progress')

  async function confirmDelete() {
    if (pendingDelete == null) return
    await db.sessions.delete(pendingDelete)
    setPendingDelete(null)
  }

  return (
    <div className="space-y-4 pb-4 pt-2">
      <header>
        <h1 className="font-display text-3xl font-semibold">Historique</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Toutes tes séances enregistrées
        </p>
      </header>

      {list.length === 0 && (
        <p className="rounded-3xl bg-[var(--color-surface-elevated)] p-6 text-center text-sm text-[var(--color-ink-muted)]">
          Aucune séance pour le moment.
        </p>
      )}

      <ul className="space-y-3">
        {list.map((session) => (
          <li
            key={session.id}
            className="rounded-3xl bg-[var(--color-surface-elevated)] p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <Link
                to={`/historique/${session.id}`}
                className="min-w-0 flex-1"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                  {formatDateTime(session.completedAt ?? session.startedAt)}
                </p>
                <p className="mt-1 font-display text-lg font-semibold">
                  {session.templateName}
                </p>
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                  {session.status === 'completed' ? 'Terminée' : 'Abandonnée'} ·{' '}
                  {session.exercises.length} exercices
                </p>
              </Link>
              <div className="flex items-center gap-1">
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
                <Link
                  to={`/historique/${session.id}`}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[var(--color-ink-muted)]"
                  aria-label="Ouvrir"
                >
                  <ChevronRight size={20} />
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {pendingDelete != null && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-[448px] rounded-3xl bg-[var(--color-surface-elevated)] p-5">
            <h2 className="font-display text-xl font-semibold">
              Supprimer cette séance ?
            </h2>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              Cette action est définitive.
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

export function SessionDetailPage() {
  const { id } = useParams()
  const sessionId = Number(id)
  const session = useLiveQuery(
    () => (Number.isFinite(sessionId) ? db.sessions.get(sessionId) : undefined),
    [sessionId],
  )

  if (!session) {
    return (
      <div className="py-10 text-center text-[var(--color-ink-muted)]">
        Séance introuvable
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-4 pt-2">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          {formatDateTime(session.completedAt ?? session.startedAt)}
        </p>
        <h1 className="font-display text-2xl font-semibold">
          {session.templateName}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Fatigue {session.preCheck.fatigue}/5
          {session.preCheck.kneePain ? ' · genoux' : ''}
          {session.preCheck.futsal24h ? ' · futsal' : ''}
          {session.preCheck.match48h ? ' · match proche' : ''}
        </p>
      </header>

      {session.exercises.map((ex) => (
        <section
          key={ex.exerciseId}
          className="rounded-3xl bg-[var(--color-surface-elevated)] p-4"
        >
          <h2 className="font-display text-lg font-semibold">{ex.exerciseName}</h2>
          <ul className="mt-3 space-y-2">
            {ex.sets.map((set) => (
              <li
                key={set.setNumber}
                className="flex items-center justify-between rounded-xl bg-[var(--color-surface)] px-3 py-2 text-sm"
              >
                <span className="font-medium">S{set.setNumber}</span>
                <span className="tabular-nums">
                  {ex.isTimed
                    ? `${set.durationSeconds ?? set.reps ?? '—'} s`
                    : `${formatSetLoad(set, { isPullup: ex.isPullup })} × ${set.reps ?? '—'}`}
                  {set.rir !== null && set.rir !== undefined
                    ? ` · RIR ${set.rir}`
                    : ''}
                  {!set.completed ? ' · non faite' : ''}
                </span>
              </li>
            ))}
          </ul>
          {ex.notes && (
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              Note : {ex.notes}
            </p>
          )}
        </section>
      ))}

      {session.notes && (
        <section className="rounded-3xl bg-[var(--color-surface-elevated)] p-4">
          <h2 className="font-semibold">Notes</h2>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            {session.notes}
          </p>
        </section>
      )}

      <Link
        to="/historique"
        className="inline-flex min-h-12 items-center justify-center text-sm font-semibold text-[var(--color-accent)]"
      >
        ← Retour à l’historique
      </Link>
    </div>
  )
}
