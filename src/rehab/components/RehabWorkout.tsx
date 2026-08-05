import { useEffect, useMemo, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, PartyPopper } from 'lucide-react'
import { db, readSettings } from '../../db'
import { getRehabCircuit } from '../rehabProgram'
import {
  abandonRehabSession,
  advanceAfterExerciseComplete,
  completeRehabSession,
  phaseAfterRest,
  phaseAfterWarmup,
  resolveRehabSettings,
  updateRehabSession,
} from '../rehab.service'
import type { RehabSession } from '../rehab.types'
import { RehabExerciseCard } from './RehabExerciseCard'
import { RehabTimer } from './RehabTimer'

export function RehabWorkout() {
  const { id } = useParams()
  const sessionId = Number(id)
  const navigate = useNavigate()
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [notes, setNotes] = useState('')
  const [showFinish, setShowFinish] = useState(false)

  const session = useLiveQuery(
    () =>
      Number.isFinite(sessionId) ? db.rehabSessions.get(sessionId) : undefined,
    [sessionId],
  )

  const appSettings = useLiveQuery(() => readSettings(), [])
  const rehabSettings = resolveRehabSettings(appSettings?.rehab)

  const circuit = session ? getRehabCircuit(session.circuitId) : undefined

  const allowLeave =
    session?.status !== 'in_progress' || leaving || showFinish

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowLeave && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state === 'blocked') setConfirmLeave(true)
  }, [blocker.state])

  const currentExercise = useMemo(() => {
    if (!session || !circuit || session.currentPhase.type !== 'exercise')
      return null
    const { exerciseIndex, side } = session.currentPhase
    return {
      exercise: circuit.exercises[exerciseIndex],
      side,
      round: session.currentPhase.round,
      exerciseIndex,
    }
  }, [session, circuit])

  async function patchSession(
    updater: (current: RehabSession) => Partial<RehabSession> | RehabSession,
  ) {
    const current = await db.rehabSessions.get(sessionId)
    if (!current) return
    const next = updater(current)
    await updateRehabSession(sessionId, {
      ...current,
      ...next,
    })
  }

  async function completeWarmup() {
    if (!circuit) return
    await patchSession(() => ({
      warmupCompleted: true,
      currentPhase: phaseAfterWarmup(circuit),
    }))
  }

  async function markSideOrExerciseDone(opts?: { reps?: number }) {
    if (!session || !circuit || session.currentPhase.type !== 'exercise') return
    const { round, exerciseIndex, side } = session.currentPhase
    const exercise = circuit.exercises[exerciseIndex]

    await patchSession((s) => {
      const rounds = structuredClone(s.rounds)
      const roundLog = rounds[round - 1]
      const progress = roundLog.exercises[exerciseIndex]

      if (side === 'left') {
        progress.leftCompleted = true
        if (opts?.reps != null) progress.repsLeft = opts.reps
      } else if (side === 'right') {
        progress.rightCompleted = true
        if (opts?.reps != null) progress.repsRight = opts.reps
      }

      if (!exercise.perSide || side === 'right' || side === 'none') {
        progress.completed = true
        if (side === 'none' && opts?.reps != null) {
          progress.repsLeft = opts.reps
        }
      } else if (side === 'left' && progress.rightCompleted) {
        progress.completed = true
      }

      const nextPhase = advanceAfterExerciseComplete(
        { ...s, rounds },
        circuit,
      )

      if (nextPhase.type === 'round_complete') {
        roundLog.completed = true
      }

      return { rounds, currentPhase: nextPhase }
    })
  }

  async function startRestAfterRound() {
    if (!session || !circuit) return
    const round =
      session.currentPhase.type === 'round_complete'
        ? session.currentPhase.round
        : 0
    if (round >= session.roundsTarget) {
      setShowFinish(true)
      await patchSession((s) => ({
        rounds: s.rounds.map((r) =>
          r.roundNumber === round ? { ...r, completed: true } : r,
        ),
        roundsCompleted: round,
      }))
      await completeRehabSession(sessionId)
      return
    }
    await patchSession(() => ({
      currentPhase: { type: 'rest', afterRound: round },
      restSecondsUsed: rehabSettings.restBetweenRoundsSeconds,
      roundsCompleted: round,
    }))
  }

  async function finishRest(afterRound: number) {
    if (!circuit || !session) return
    if (afterRound >= session.roundsTarget) {
      setShowFinish(true)
      await completeRehabSession(sessionId)
      return
    }
    await patchSession(() => ({
      currentPhase: phaseAfterRest(
        afterRound,
        session.roundsTarget,
        circuit,
      ),
      roundsCompleted: afterRound,
    }))
  }

  async function skipRoundRest() {
    if (session?.currentPhase.type !== 'rest') return
    await finishRest(session.currentPhase.afterRound)
  }

  async function handleFinishedContinue() {
    setLeaving(true)
    if (notes.trim()) {
      await updateRehabSession(sessionId, { notes: notes.trim() })
    }
    const returnId = session?.returnToWorkoutId
    if (returnId != null) {
      void navigate(`/seance/${returnId}`)
    } else {
      void navigate('/reeducation')
    }
  }

  async function leaveAndAbandon() {
    setLeaving(true)
    if (session?.status === 'in_progress') {
      await abandonRehabSession(sessionId)
    }
    setConfirmLeave(false)
    if (blocker.state === 'blocked') blocker.proceed()
    else void navigate('/reeducation')
  }

  const stay = () => {
    setConfirmLeave(false)
    if (blocker.state === 'blocked') blocker.reset()
  }

  // Auto-start rest shortly after round_complete display
  useEffect(() => {
    if (session?.currentPhase.type !== 'round_complete') return
    const t = window.setTimeout(() => {
      void startRestAfterRound()
    }, 1500)
    return () => window.clearTimeout(t)
  }, [session?.currentPhase.type])

  if (!session || !circuit) {
    return (
      <div className="py-10 text-center text-[var(--color-ink-muted)]">
        Chargement du circuit…
      </div>
    )
  }

  const phase = session.currentPhase
  const repsForSide =
    currentExercise && phase.type === 'exercise'
      ? phase.side === 'right'
        ? session.rounds[phase.round - 1]?.exercises[phase.exerciseIndex]
            ?.repsRight ?? 0
        : session.rounds[phase.round - 1]?.exercises[phase.exerciseIndex]
            ?.repsLeft ?? 0
      : 0

  return (
    <div className="space-y-4 pb-8 pt-2">
      <header className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => {
            if (session.status === 'in_progress' && !showFinish)
              setConfirmLeave(true)
            else void navigate('/reeducation')
          }}
          className="mt-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-[var(--color-surface-elevated)]"
          aria-label="Retour"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
            {session.circuitName}
          </p>
          <h1 className="font-display text-2xl font-semibold leading-tight">
            {phase.type === 'warmup' && 'Échauffement'}
            {phase.type === 'exercise' &&
              `Tour ${phase.round} / ${session.roundsTarget}`}
            {phase.type === 'round_complete' && 'Tour terminé'}
            {phase.type === 'rest' && 'Repos'}
            {(phase.type === 'finished' || showFinish) && 'Circuit terminé'}
          </h1>
        </div>
      </header>

      {phase.type === 'warmup' && (
        <RehabExerciseCard
          exercise={{
            ...circuit.warmup,
            holdSeconds: session.warmupSeconds,
          }}
          side="none"
          showIllustration={rehabSettings.showIllustrations}
          soundEnabled={rehabSettings.soundEnabled}
          vibrationEnabled={rehabSettings.vibrationEnabled}
          onHoldComplete={() => void completeWarmup()}
          onMarkDone={() => void completeWarmup()}
        />
      )}

      {phase.type === 'exercise' && currentExercise?.exercise && (
        <RehabExerciseCard
          exercise={currentExercise.exercise}
          side={currentExercise.side}
          showIllustration={rehabSettings.showIllustrations}
          soundEnabled={rehabSettings.soundEnabled}
          vibrationEnabled={rehabSettings.vibrationEnabled}
          repsCount={repsForSide}
          onRepsChange={(n) => {
            void patchSession((s) => {
              if (s.currentPhase.type !== 'exercise') return s
              const rounds = structuredClone(s.rounds)
              const progress =
                rounds[s.currentPhase.round - 1].exercises[
                  s.currentPhase.exerciseIndex
                ]
              if (s.currentPhase.side === 'right') progress.repsRight = n
              else progress.repsLeft = n
              return { rounds }
            })
          }}
          onHoldComplete={() => void markSideOrExerciseDone()}
          onMarkDone={() => void markSideOrExerciseDone({ reps: repsForSide })}
        />
      )}

      {phase.type === 'round_complete' && (
        <div className="rounded-3xl bg-[var(--color-accent-soft)] p-6 text-center">
          <p className="font-display text-2xl font-semibold text-[var(--color-accent)]">
            Tour terminé
          </p>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            Repos dans un instant…
          </p>
          <button
            type="button"
            onClick={() => void startRestAfterRound()}
            className="mt-4 min-h-12 rounded-2xl bg-[var(--color-accent)] px-6 font-semibold text-white dark:text-[#062218]"
          >
            Lancer le repos
          </button>
        </div>
      )}

      {phase.type === 'rest' && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-ink-muted)]">
            Repos entre les tours
            {phase.afterRound < session.roundsTarget
              ? ` · prochain : tour ${phase.afterRound + 1}`
              : ' · dernier tour terminé'}
          </p>
          <RehabTimer
            key={`rest-${phase.afterRound}`}
            seconds={session.restSecondsUsed || rehabSettings.restBetweenRoundsSeconds}
            label="Repos"
            soundEnabled={rehabSettings.soundEnabled}
            vibrationEnabled={rehabSettings.vibrationEnabled}
            onComplete={() => void finishRest(phase.afterRound)}
            onSkip={() => void skipRoundRest()}
          />
        </div>
      )}

      {(phase.type === 'finished' || showFinish) && (
        <div className="animate-[fadeIn_0.6s_ease] rounded-3xl bg-[var(--color-surface-elevated)] p-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <PartyPopper size={40} className="animate-bounce" />
          </div>
          <h2 className="font-display text-3xl font-semibold">Circuit terminé</h2>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            Brava — ta rééducation est enregistrée dans l’historique dédié.
          </p>
          <label className="mt-4 block text-left">
            <span className="mb-1 block text-xs font-semibold uppercase text-[var(--color-ink-muted)]">
              Notes (facultatif)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Sensations, douleurs, remarques…"
              className="w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
            />
          </label>
          <button
            type="button"
            onClick={() => void handleFinishedContinue()}
            className="mt-6 min-h-14 w-full rounded-2xl bg-[var(--color-accent)] font-semibold text-white dark:text-[#062218]"
          >
            {session.returnToWorkoutId != null
              ? 'Continuer vers la séance'
              : 'Retour à la rééducation'}
          </button>
        </div>
      )}

      {(confirmLeave || blocker.state === 'blocked') && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-[448px] rounded-3xl bg-[var(--color-surface-elevated)] p-5">
            <h2 className="font-display text-xl font-semibold">
              Quitter le circuit ?
            </h2>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              Le circuit sera marqué comme abandonné. Tu pourras en relancer un
              plus tard.
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
