import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Dumbbell, HeartPulse, Play } from 'lucide-react'
import { db, getProgram, getSettings, readProgram } from '../db'
import { PreRehabPrompt } from '../components/PreRehabPrompt'
import { PreWorkoutCheck } from '../components/PreWorkoutCheck'
import { startRehabSession } from '../rehab/rehab.service'
import type { PreCheck, WorkoutLetter } from '../types'
import {
  createSessionFromTemplate,
  formatDateTime,
  formatSetLoad,
  getNextWorkoutLetter,
  isThisWeek,
} from '../utils/workout'

const defaultPreCheck: PreCheck = {
  fatigue: 3,
  kneePain: false,
  futsal24h: false,
  match48h: false,
}

export function HomePage() {
  const navigate = useNavigate()
  const [pendingLetter, setPendingLetter] = useState<WorkoutLetter | null>(null)
  const [askRehab, setAskRehab] = useState(false)
  const [preCheck, setPreCheck] = useState<PreCheck>(defaultPreCheck)

  const data = useLiveQuery(async () => {
    const [program, sessions] = await Promise.all([
      readProgram(),
      db.sessions.orderBy('startedAt').reverse().toArray(),
    ])
    return { program, sessions }
  }, [])

  const completed = useMemo(
    () => (data?.sessions ?? []).filter((s) => s.status === 'completed'),
    [data?.sessions],
  )

  const lastCompleted = completed[0]
  const nextLetter = getNextWorkoutLetter(lastCompleted?.templateId)
  const nextWorkout = data?.program.workouts.find((w) => w.id === nextLetter)
  const inProgress = (data?.sessions ?? []).find((s) => s.status === 'in_progress')
  const weekCount = completed.filter((s) =>
    isThisWeek(s.completedAt ?? s.startedAt),
  ).length

  const lastPullup = useMemo(() => {
    for (const session of completed) {
      const pullup = session.exercises.find((e) => e.isPullup)
      if (!pullup) continue
      const sets = pullup.sets.filter((s) => s.completed && s.reps !== null)
      if (sets.length === 0) continue
      return {
        name: pullup.exerciseName,
        date: session.completedAt ?? session.startedAt,
        reps: sets.map((s) => s.reps).join(', '),
        sampleSet: sets[0],
        total: sets.reduce((sum, s) => sum + (s.reps ?? 0), 0),
      }
    }

    const seeded = data?.program.workouts
      .flatMap((w) => w.exercises)
      .find((e) => e.id === 'a-tractions-pronation' && e.initialKnownSets)
    if (seeded?.initialKnownSets) {
      return {
        name: seeded.name,
        date: null as string | null,
        reps: seeded.initialKnownSets.map((s) => s.reps).join(', '),
        sampleSet: {
          setNumber: 1,
          weight: 0,
          useBodyweight: true,
          bodyWeightKg: null,
          reps: seeded.initialKnownSets[0]?.reps ?? null,
          rir: null,
          durationSeconds: null,
          completed: true,
        },
        total: seeded.initialKnownSets.reduce((sum, s) => sum + s.reps, 0),
      }
    }
    return null
  }, [completed, data?.program.workouts])

  async function createWorkoutSession(
    letter: WorkoutLetter,
  ): Promise<number | undefined> {
    const program = await getProgram()
    const settings = await getSettings()
    const template = program.workouts.find((w) => w.id === letter)
    if (!template) return undefined

    const existing = await db.sessions
      .where('status')
      .equals('in_progress')
      .first()
    if (existing?.id) {
      await db.sessions.update(existing.id, { status: 'abandoned' })
    }

    const session = createSessionFromTemplate(
      template,
      preCheck,
      settings.restOverrides,
    )
    return db.sessions.add(session)
  }

  function resetPending() {
    setPendingLetter(null)
    setAskRehab(false)
    setPreCheck(defaultPreCheck)
  }

  async function startWorkoutOnly(letter: WorkoutLetter) {
    const id = await createWorkoutSession(letter)
    resetPending()
    if (id != null) void navigate(`/seance/${id}`)
  }

  async function startRehabThenWorkout(letter: WorkoutLetter) {
    const workoutId = await createWorkoutSession(letter)
    resetPending()
    if (workoutId == null) return
    const rehabId = await startRehabSession({ returnToWorkoutId: workoutId })
    void navigate(`/reeducation/circuit/${rehabId}`)
  }

  const pendingLabel =
    data?.program.workouts.find((w) => w.id === pendingLetter)?.name ??
    (pendingLetter ? `Séance ${pendingLetter}` : 'la séance')

  return (
    <div className="space-y-5 pb-4 pt-2">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          TrackFit
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Prête à t’entraîner
        </h1>
      </header>

      {inProgress && (
        <button
          type="button"
          onClick={() => navigate(`/seance/${inProgress.id}`)}
          className="flex w-full items-center justify-between gap-3 rounded-3xl border border-[var(--color-accent)] bg-[var(--color-accent-soft)] p-4 text-left"
        >
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--color-accent)]">
              Séance en cours
            </p>
            <p className="font-display text-lg font-semibold">
              {inProgress.templateName}
            </p>
          </div>
          <ChevronRight className="text-[var(--color-accent)]" />
        </button>
      )}

      <Link
        to="/reeducation"
        className="flex w-full items-center justify-between gap-3 rounded-3xl bg-[var(--color-surface-elevated)] p-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <HeartPulse size={22} />
          </div>
          <div>
            <p className="font-display text-lg font-semibold">
              Circuit Kiné Genou
            </p>
            <p className="text-sm text-[var(--color-ink-muted)]">
              Rééducation · avant ou hors séance
            </p>
          </div>
        </div>
        <ChevronRight className="text-[var(--color-ink-muted)]" />
      </Link>

      <section className="rounded-3xl bg-[var(--color-surface-elevated)] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          Prochaine séance
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold">
          {nextWorkout?.name ?? 'Séance A'}
        </h2>
        <p className="text-[var(--color-ink-muted)]">
          {nextWorkout?.subtitle ?? 'Force et largeur'}
        </p>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          {nextWorkout?.exercises.length ?? 0} exercices
        </p>

        <button
          type="button"
          onClick={() => setPendingLetter(nextLetter)}
          className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-accent)] px-4 text-base font-semibold text-white dark:text-[#062218]"
        >
          <Play size={20} fill="currentColor" />
          Commencer la séance
        </button>
      </section>

      <section>
        <p className="mb-2 text-sm font-semibold text-[var(--color-ink-muted)]">
          Choisir manuellement
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(['A', 'B', 'C'] as const).map((letter) => {
            const w = data?.program.workouts.find((x) => x.id === letter)
            return (
              <button
                key={letter}
                type="button"
                onClick={() => setPendingLetter(letter)}
                className="min-h-20 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface-elevated)] p-3 text-center"
              >
                <span className="font-display text-xl font-semibold">{letter}</span>
                <span className="mt-1 block text-[11px] leading-tight text-[var(--color-ink-muted)]">
                  {w?.subtitle}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-[var(--color-surface-elevated)] p-4">
          <p className="text-xs font-medium text-[var(--color-ink-muted)]">
            Cette semaine
          </p>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums">
            {weekCount}
          </p>
          <p className="text-sm text-[var(--color-ink-muted)]">séances</p>
        </div>
        <div className="rounded-3xl bg-[var(--color-surface-elevated)] p-4">
          <p className="text-xs font-medium text-[var(--color-ink-muted)]">
            Dernière séance
          </p>
          {lastCompleted ? (
            <>
              <p className="mt-2 font-display text-lg font-semibold leading-tight">
                {lastCompleted.templateId}
              </p>
              <p className="text-sm text-[var(--color-ink-muted)]">
                {formatDateTime(lastCompleted.completedAt ?? lastCompleted.startedAt)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              Aucune encore
            </p>
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-[var(--color-surface-elevated)] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <Dumbbell size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[var(--color-ink-muted)]">
              Dernier résultat aux tractions
            </p>
            {lastPullup ? (
              <>
                <p className="mt-1 font-semibold">{lastPullup.name}</p>
                <p className="text-sm text-[var(--color-ink)]">
                  {lastPullup.reps} rep ·{' '}
                  {formatSetLoad(lastPullup.sampleSet, { isPullup: true })} ·
                  total {lastPullup.total}
                </p>
                {lastPullup.date && (
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    {formatDateTime(lastPullup.date)}
                  </p>
                )}
                {!lastPullup.date && (
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    Résultat initial connu
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                Pas encore de données
              </p>
            )}
          </div>
        </div>
      </section>

      {pendingLetter && !askRehab && (
        <PreWorkoutCheck
          workoutLabel={pendingLabel}
          value={preCheck}
          onChange={setPreCheck}
          onCancel={resetPending}
          onConfirm={() => setAskRehab(true)}
        />
      )}

      {pendingLetter && askRehab && (
        <PreRehabPrompt
          workoutLabel={pendingLabel}
          onCancel={resetPending}
          onYes={() => void startRehabThenWorkout(pendingLetter)}
          onNo={() => void startWorkoutOnly(pendingLetter)}
        />
      )}
    </div>
  )
}
