import { useCallback, useEffect, useMemo, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, CheckCircle2, Info } from 'lucide-react'
import { db, readProgram, readSettings } from '../db'
import { SetInputRow } from '../components/SetInputRow'
import { useRestTimer } from '../context/RestTimerContext'
import type { ExerciseLog, SetLog, WorkoutSession } from '../types'
import { getProgressionMessage } from '../utils/progression'
import {
  formatRest,
  formatSetLoad,
  getInitialKnownSets,
  getLastCompletedSets,
  shouldStartRest,
  usesBodyweight,
} from '../utils/workout'

export function WorkoutPage() {
  const { id } = useParams()
  const sessionId = Number(id)
  const navigate = useNavigate()
  const { start: startRest, dismiss: dismissRest, isActive } = useRestTimer()
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [expandedTips, setExpandedTips] = useState<Record<string, boolean>>({})

  const session = useLiveQuery(
    () => (Number.isFinite(sessionId) ? db.sessions.get(sessionId) : undefined),
    [sessionId],
  )

  const history = useLiveQuery(
    () => db.sessions.where('status').equals('completed').toArray(),
    [],
  )

  const program = useLiveQuery(() => readProgram(), [])
  const settings = useLiveQuery(() => readSettings(), [])
  const bodyWeightKg = settings?.bodyWeightKg ?? null

  const allowLeave = session?.status !== 'in_progress' || finishing

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowLeave && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setConfirmLeave(true)
    }
  }, [blocker.state])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!allowLeave) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [allowLeave])

  const lastByExercise = useMemo(() => {
    const map = new Map<
      string,
      { weight: number | null; reps: number | null; sets: SetLog[] }
    >()
    if (!session || !history) return map

    for (const exercise of session.exercises) {
      const last = getLastCompletedSets(history, exercise.exerciseId)
      if (last) {
        map.set(exercise.exerciseId, {
          weight: last[0]?.weight ?? null,
          reps: last[last.length - 1]?.reps ?? null,
          sets: last,
        })
      } else {
        const template = program?.workouts.find(
          (w) => w.id === session.templateId,
        )
        const known = getInitialKnownSets(template, exercise.exerciseId)
        if (known) {
          map.set(exercise.exerciseId, {
            weight: known[0]?.weight ?? 0,
            reps: known[known.length - 1]?.reps ?? null,
            sets: known.map((k, i) => ({
              setNumber: i + 1,
              weight: k.weight,
              useBodyweight: Boolean(exercise.isPullup),
              bodyWeightKg: null,
              reps: k.reps,
              rir: null,
              durationSeconds: null,
              completed: true,
            })),
          })
        }
      }
    }
    return map
  }, [session, history, program])

  const updateSession = useCallback(
    async (updater: (current: WorkoutSession) => WorkoutSession) => {
      const current = await db.sessions.get(sessionId)
      if (!current) return
      const next = updater(current)
      await db.sessions.put(next)
    },
    [sessionId],
  )

  const updateSet = async (
    exerciseId: string,
    setNumber: number,
    patch: Partial<SetLog>,
  ) => {
    await updateSession((current) => ({
      ...current,
      exercises: current.exercises.map((ex) =>
        ex.exerciseId !== exerciseId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) =>
                s.setNumber === setNumber ? { ...s, ...patch } : s,
              ),
            },
      ),
    }))
  }

  const validateSet = async (exercise: ExerciseLog, setNumber: number) => {
    await updateSession((current) => {
      const exercises = current.exercises.map((ex) => {
        if (ex.exerciseId !== exercise.exerciseId) return ex
        return {
          ...ex,
          sets: ex.sets.map((s) => {
            if (s.setNumber !== setNumber) return s
            const next: SetLog = {
              ...s,
              completed: true,
              weight: s.weight ?? (s.useBodyweight || ex.isPullup ? 0 : s.weight),
            }
            if (next.useBodyweight || (ex.isPullup && usesBodyweight(next, true))) {
              next.useBodyweight = true
              next.bodyWeightKg = bodyWeightKg
              if (next.weight === null) next.weight = 0
            }
            return next
          }),
        }
      })
      return { ...current, exercises }
    })

    if (shouldStartRest(exercise)) {
      startRest(exercise.restSeconds)
    }
  }

  const copyWeightFromFirst = async (exerciseId: string) => {
    await updateSession((current) => ({
      ...current,
      exercises: current.exercises.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex
        const first = ex.sets[0]
        if (!first || first.weight === null || first.weight === undefined) return ex
        return {
          ...ex,
          sets: ex.sets.map((s, idx) =>
            idx === 0 || s.completed
              ? s
              : {
                  ...s,
                  weight: first.weight,
                  useBodyweight: first.useBodyweight,
                },
          ),
        }
      }),
    }))
  }

  const prefillWeights = useCallback(async () => {
    if (!session || session.status !== 'in_progress') return
    let changed = false
    const exercises = session.exercises.map((ex) => {
      const last = lastByExercise.get(ex.exerciseId)
      const sets = ex.sets.map((s, idx) => {
        if (s.completed) return s
        let next = s
        const fromLast = last?.sets[idx] ?? last?.sets[last.sets.length - 1]
        if (s.weight === null && fromLast?.weight !== null && fromLast?.weight !== undefined) {
          changed = true
          next = {
            ...next,
            weight: fromLast.weight,
            useBodyweight:
              fromLast.useBodyweight ?? usesBodyweight(fromLast, ex.isPullup),
          }
        } else if (s.weight === null && ex.isPullup) {
          changed = true
          next = { ...next, weight: 0, useBodyweight: true }
        } else if (ex.isPullup && next.useBodyweight === undefined) {
          changed = true
          next = { ...next, useBodyweight: true, weight: next.weight ?? 0 }
        }
        return next
      })
      return { ...ex, sets }
    })
    if (changed) {
      await db.sessions.put({ ...session, exercises })
    }
  }, [session, lastByExercise])

  useEffect(() => {
    void prefillWeights()
  }, [prefillWeights])

  const ignoreProgression = async (exerciseId: string) => {
    await updateSession((current) => ({
      ...current,
      ignoredProgressions: [
        ...(current.ignoredProgressions ?? []),
        exerciseId,
      ],
    }))
  }

  const finishSession = async () => {
    setFinishing(true)
    dismissRest()
    await updateSession((current) => ({
      ...current,
      status: 'completed',
      completedAt: new Date().toISOString(),
    }))
    void navigate('/')
  }

  const leaveAndAbandon = async () => {
    setFinishing(true)
    dismissRest()
    if (session?.status === 'in_progress') {
      await updateSession((current) => ({
        ...current,
        status: 'abandoned',
      }))
    }
    setConfirmLeave(false)
    if (blocker.state === 'blocked') blocker.proceed()
    else void navigate('/')
  }

  const stay = () => {
    setConfirmLeave(false)
    if (blocker.state === 'blocked') blocker.reset()
  }

  if (!session) {
    return (
      <div className="py-10 text-center text-[var(--color-ink-muted)]">
        Chargement de la séance…
      </div>
    )
  }

  const showAdvice =
    session.preCheck.fatigue >= 4 || session.preCheck.match48h

  return (
    <div className={`space-y-4 pb-8 pt-2 ${isActive ? 'pb-4' : ''}`}>
      <header className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => {
            if (session.status === 'in_progress') setConfirmLeave(true)
            else void navigate('/')
          }}
          className="mt-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-[var(--color-surface-elevated)]"
          aria-label="Retour"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
            Séance {session.templateId}
          </p>
          <h1 className="font-display text-2xl font-semibold leading-tight">
            {session.templateName}
          </h1>
        </div>
      </header>

      {showAdvice && session.status === 'in_progress' && (
        <div className="rounded-2xl border border-[var(--color-warn)]/40 bg-[color-mix(in_oklab,var(--color-warn)_12%,transparent)] p-3 text-sm">
          <p className="font-semibold text-[var(--color-warn)]">
            Mode récupération conseillé
          </p>
          <p className="mt-1 text-[var(--color-ink)]">
            Une série en moins sur les jambes a été appliquée. Garde 2–3 rep en
            réserve, pas de record.
          </p>
        </div>
      )}

      {session.exercises.map((exercise, index) => {
        const last = lastByExercise.get(exercise.exerciseId)
        const progression = getProgressionMessage(exercise)
        const ignored = session.ignoredProgressions?.includes(
          exercise.exerciseId,
        )
        const tipsOpen = expandedTips[exercise.exerciseId]

        return (
          <section
            key={exercise.exerciseId}
            className="rounded-3xl bg-[var(--color-surface-elevated)] p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-[var(--color-ink-muted)]">
                  Exercice {index + 1}
                  {exercise.supersetsGroup
                    ? ` · Superset ${exercise.supersetsGroup}${
                        exercise.supersetsOrder === 1 ? 'A' : 'B'
                      }`
                    : ''}
                </p>
                <h2 className="font-display text-lg font-semibold leading-tight">
                  {exercise.exerciseName}
                </h2>
              </div>
              {exercise.reducedSets && (
                <span className="rounded-full bg-[var(--color-warn)]/15 px-2 py-1 text-[10px] font-semibold text-[var(--color-warn)]">
                  −1 série
                </span>
              )}
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
              <Meta
                label="Séries / reps"
                value={
                  exercise.isTimed
                    ? `${exercise.setsTarget} × ${exercise.repMin}–${exercise.repMax} s`
                    : `${exercise.setsTarget} × ${exercise.repMin}–${exercise.repMax}${
                        exercise.perSide ? ' / côté' : ''
                      }`
                }
              />
              <Meta
                label="Repos"
                value={
                  exercise.supersetsOrder === 1
                    ? 'Après le 2ᵉ du supersets'
                    : formatRest(exercise.restSeconds)
                }
              />
              <Meta
                label="Dernière charge"
                value={
                  last
                    ? last.sets
                        .map((s) =>
                          formatSetLoad(s, {
                            isPullup: exercise.isPullup,
                            fallbackBodyWeightKg: bodyWeightKg,
                          }),
                        )
                        .join(' / ')
                    : exercise.isPullup
                      ? bodyWeightKg
                        ? `PDC (${bodyWeightKg} kg)`
                        : 'PDC'
                      : '—'
                }
              />
              <Meta
                label="Dernières reps"
                value={
                  last
                    ? last.sets
                        .map((s) =>
                          exercise.isTimed
                            ? `${s.durationSeconds ?? s.reps ?? '—'} s`
                            : String(s.reps ?? '—'),
                        )
                        .join(' / ')
                    : '—'
                }
              />
            </div>

            <button
              type="button"
              onClick={() =>
                setExpandedTips((prev) => ({
                  ...prev,
                  [exercise.exerciseId]: !prev[exercise.exerciseId],
                }))
              }
              className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-[var(--color-accent)]"
            >
              <Info size={16} />
              {tipsOpen ? 'Masquer les consignes' : 'Consignes & adaptations'}
            </button>

            {tipsOpen && (
              <div className="mb-3 space-y-2 rounded-2xl bg-[var(--color-surface)] p-3 text-sm">
                {exercise.cues.length > 0 && (
                  <div>
                    <p className="font-semibold">Consignes</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-[var(--color-ink-muted)]">
                      {exercise.cues.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {exercise.heightAdaptations.length > 0 && (
                  <div>
                    <p className="font-semibold">Adaptations 1,55 m</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-[var(--color-ink-muted)]">
                      {exercise.heightAdaptations.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {exercise.sets.map((set) => (
                <SetInputRow
                  key={set.setNumber}
                  set={set}
                  isTimed={exercise.isTimed}
                  allowBodyweight={exercise.isPullup}
                  bodyWeightKg={bodyWeightKg}
                  showCopy={set.setNumber > 1 && !exercise.isTimed}
                  onCopyWeight={() =>
                    void copyWeightFromFirst(exercise.exerciseId)
                  }
                  onChange={(patch) =>
                    void updateSet(exercise.exerciseId, set.setNumber, patch)
                  }
                  onValidate={() => void validateSet(exercise, set.setNumber)}
                />
              ))}
            </div>

            {progression && !ignored && session.status === 'in_progress' && (
              <div className="mt-3 rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] p-3">
                <p className="flex items-center gap-2 font-semibold text-[var(--color-accent)]">
                  <CheckCircle2 size={18} />
                  {exercise.isPullup
                    ? 'Ajout de lest possible'
                    : progression}
                </p>
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                  {exercise.isPullup
                    ? 'Toutes les séries ont atteint le max de répétitions au poids du corps (ou lest actuel). Tu peux ajouter un peu de lest si tu veux — rien n’est modifié automatiquement.'
                    : 'Toutes les séries ont atteint le max de répétitions. La charge n’est pas modifiée automatiquement.'}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void ignoreProgression(exercise.exerciseId)}
                    className="min-h-11 rounded-xl bg-[var(--color-accent)] text-sm font-semibold text-white dark:text-[#062218]"
                  >
                    Noté
                  </button>
                  <button
                    type="button"
                    onClick={() => void ignoreProgression(exercise.exerciseId)}
                    className="min-h-11 rounded-xl border border-[var(--color-line)] text-sm font-medium"
                  >
                    Ignorer
                  </button>
                </div>
              </div>
            )}
          </section>
        )
      })}

      {session.status === 'in_progress' && (
        <button
          type="button"
          onClick={() => void finishSession()}
          className="min-h-14 w-full rounded-2xl bg-[var(--color-ink)] px-4 text-base font-semibold text-[var(--color-surface)]"
        >
          Terminer la séance
        </button>
      )}

      {(confirmLeave || blocker.state === 'blocked') && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-[448px] rounded-3xl bg-[var(--color-surface-elevated)] p-5">
            <h2 className="font-display text-xl font-semibold">
              Quitter la séance ?
            </h2>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              La séance n’est pas terminée. Elle sera marquée comme abandonnée.
            </p>
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={stay}
                className="min-h-12 rounded-2xl bg-[var(--color-accent)] font-semibold text-white dark:text-[#062218]"
              >
                Rester
              </button>
              <button
                type="button"
                onClick={() => void leaveAndAbandon()}
                className="min-h-12 rounded-2xl border border-[var(--color-line)] font-medium text-[var(--color-danger)]"
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-surface)] px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold leading-snug">{value}</p>
    </div>
  )
}
