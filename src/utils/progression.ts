import type { ExerciseLog, SetLog } from '../types'
import { getEffectiveLoad } from './workout'

export function allSetsHitRepMax(exercise: ExerciseLog): boolean {
  if (exercise.isTimed || exercise.kind === 'isometric') return false
  const completed = exercise.sets.filter((s) => s.completed)
  if (completed.length < exercise.setsTarget) return false
  return completed.every(
    (s) => s.reps !== null && s.reps >= exercise.repMax,
  )
}

export function getProgressionMessage(exercise: ExerciseLog): string | null {
  if (!allSetsHitRepMax(exercise)) return null
  return 'Augmentation de charge possible'
}

export interface ExerciseStats {
  exerciseId: string
  exerciseName: string
  isPullup: boolean
  isTimed: boolean
  bestWeight: number
  bestReps: number
  totalVolume: number
  history: Array<{
    date: string
    weight: number
    reps: number
    totalReps: number
    volume: number
  }>
  pullupBestTotal: number
  pullupSessions: Array<{
    date: string
    sets: SetLog[]
    totalReps: number
    weight: number
  }>
}

export function buildExerciseStats(
  exerciseId: string,
  exerciseName: string,
  sessions: Array<{
    completedAt?: string
    startedAt: string
    status: string
    exercises: ExerciseLog[]
  }>,
  options?: { isPullup?: boolean; isTimed?: boolean },
): ExerciseStats {
  const history: ExerciseStats['history'] = []
  const pullupSessions: ExerciseStats['pullupSessions'] = []
  let bestWeight = 0
  let bestReps = 0
  let totalVolume = 0
  let pullupBestTotal = 0

  const completed = sessions
    .filter((s) => s.status === 'completed')
    .sort(
      (a, b) =>
        new Date(a.completedAt ?? a.startedAt).getTime() -
        new Date(b.completedAt ?? b.startedAt).getTime(),
    )

  for (const session of completed) {
    const ex = session.exercises.find((e) => e.exerciseId === exerciseId)
    if (!ex) continue
    const done = ex.sets.filter((s) => s.completed)
    if (done.length === 0) continue

    const date = session.completedAt ?? session.startedAt
    const loads = done.map(
      (s) => getEffectiveLoad(s, { isPullup: ex.isPullup }) ?? 0,
    )
    const maxWeight = Math.max(...loads)
    const maxReps = Math.max(...done.map((s) => s.reps ?? s.durationSeconds ?? 0))
    const volume = done.reduce((sum, s) => {
      if (ex.isTimed) return sum
      const load = getEffectiveLoad(s, { isPullup: ex.isPullup })
      if (load === null || s.reps === null) return sum
      return sum + load * s.reps
    }, 0)
    const totalReps = done.reduce((sum, s) => sum + (s.reps ?? 0), 0)

    bestWeight = Math.max(bestWeight, maxWeight)
    bestReps = Math.max(bestReps, maxReps)
    totalVolume += volume

    history.push({
      date,
      weight: maxWeight,
      reps: maxReps,
      totalReps,
      volume,
    })

    if (options?.isPullup || ex.isPullup) {
      pullupBestTotal = Math.max(pullupBestTotal, totalReps)
      pullupSessions.push({
        date,
        sets: done,
        totalReps,
        weight: maxWeight,
      })
    }
  }

  return {
    exerciseId,
    exerciseName,
    isPullup: Boolean(options?.isPullup),
    isTimed: Boolean(options?.isTimed),
    bestWeight,
    bestReps,
    totalVolume,
    history,
    pullupBestTotal,
    pullupSessions,
  }
}

export function lastSetSummary(sets: SetLog[] | null): {
  weight: number | null
  reps: number | null
} {
  if (!sets || sets.length === 0) return { weight: null, reps: null }
  const last = sets[sets.length - 1]
  return { weight: last.weight, reps: last.reps }
}
