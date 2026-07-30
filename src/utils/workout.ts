import type {
  ExerciseLog,
  ExerciseTemplate,
  PreCheck,
  SetLog,
  WorkoutLetter,
  WorkoutSession,
  WorkoutTemplate,
} from '../types'

export function createEmptySets(
  count: number,
  options?: {
    defaultWeight?: number | null
    useBodyweight?: boolean
  },
): SetLog[] {
  return Array.from({ length: count }, (_, i) => ({
    setNumber: i + 1,
    weight: options?.defaultWeight ?? null,
    useBodyweight: options?.useBodyweight ?? false,
    bodyWeightKg: null,
    reps: null,
    rir: null,
    durationSeconds: null,
    completed: false,
  }))
}

export function exerciseToLog(
  exercise: ExerciseTemplate,
  options?: { reduceLegSets?: boolean; restOverride?: number },
): ExerciseLog {
  let setsTarget = exercise.sets
  if (options?.reduceLegSets && exercise.isLeg && !exercise.isTimed) {
    setsTarget = Math.max(1, exercise.sets - 1)
  }

  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    kind: exercise.kind,
    setsTarget,
    repMin: exercise.repMin,
    repMax: exercise.repMax,
    restSeconds: options?.restOverride ?? exercise.restSeconds,
    isTimed: exercise.isTimed,
    perSide: exercise.perSide,
    isPullup: exercise.isPullup,
    isLeg: exercise.isLeg,
    supersetsGroup: exercise.supersetsGroup,
    supersetsOrder: exercise.supersetsOrder,
    cues: exercise.cues,
    heightAdaptations: exercise.heightAdaptations,
    // Tractions : case PDC cochée, lest à 0 par défaut
    sets: createEmptySets(setsTarget, {
      defaultWeight: exercise.isPullup ? 0 : null,
      useBodyweight: Boolean(exercise.isPullup),
    }),
    reducedSets: options?.reduceLegSets && exercise.isLeg && !exercise.isTimed,
  }
}

export function shouldShowRecommendation(preCheck: PreCheck): boolean {
  return preCheck.fatigue >= 4 || preCheck.match48h
}

export function createSessionFromTemplate(
  template: WorkoutTemplate,
  preCheck: PreCheck,
  restOverrides: Record<string, number>,
): Omit<WorkoutSession, 'id'> {
  const recommend = shouldShowRecommendation(preCheck)
  return {
    templateId: template.id,
    templateName: `${template.name} — ${template.subtitle}`,
    startedAt: new Date().toISOString(),
    status: 'in_progress',
    preCheck,
    exercises: template.exercises.map((ex) =>
      exerciseToLog(ex, {
        reduceLegSets: recommend,
        restOverride: restOverrides[ex.id],
      }),
    ),
    ignoredProgressions: [],
  }
}

export function getNextWorkoutLetter(
  lastCompleted: WorkoutLetter | undefined,
): WorkoutLetter {
  if (!lastCompleted) return 'A'
  if (lastCompleted === 'A') return 'B'
  if (lastCompleted === 'B') return 'C'
  return 'A'
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function startOfWeek(date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + diff)
  return d
}

export function isThisWeek(iso: string): boolean {
  const date = new Date(iso)
  const start = startOfWeek()
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return date >= start && date < end
}

export function getLastCompletedSets(
  sessions: WorkoutSession[],
  exerciseId: string,
): SetLog[] | null {
  const completed = sessions
    .filter((s) => s.status === 'completed')
    .sort(
      (a, b) =>
        new Date(b.completedAt ?? b.startedAt).getTime() -
        new Date(a.completedAt ?? a.startedAt).getTime(),
    )

  for (const session of completed) {
    const exercise = session.exercises.find((e) => e.exerciseId === exerciseId)
    if (exercise) {
      const done = exercise.sets.filter((s) => s.completed)
      if (done.length > 0) return done
    }
  }
  return null
}

export function getInitialKnownSets(
  template: WorkoutTemplate | undefined,
  exerciseId: string,
): Array<{ weight: number; reps: number }> | null {
  const exercise = template?.exercises.find((e) => e.id === exerciseId)
  return exercise?.initialKnownSets ?? null
}

export function formatWeight(weight: number | null | undefined): string {
  if (weight === null || weight === undefined) return '—'
  if (weight === 0) return '0 kg'
  return `${weight} kg`
}

/** Compatibilité anciennes séries tractions (weight = 0 sans flag). */
export function usesBodyweight(set: SetLog, isPullup?: boolean): boolean {
  if (set.useBodyweight) return true
  return Boolean(isPullup && set.weight === 0 && set.bodyWeightKg == null)
}

/** Charge effective = PDC (+ lest) ou charge seule. */
export function getEffectiveLoad(
  set: SetLog,
  options?: { isPullup?: boolean; fallbackBodyWeightKg?: number | null },
): number | null {
  const added = set.weight
  if (usesBodyweight(set, options?.isPullup)) {
    const bw = set.bodyWeightKg ?? options?.fallbackBodyWeightKg
    if (bw == null || bw <= 0) {
      return added === null ? null : added
    }
    return bw + (added ?? 0)
  }
  return added
}

/** Affichage lisible d’une série (PDC + lest éventuel). */
export function formatSetLoad(
  set: SetLog,
  options?: { isPullup?: boolean; fallbackBodyWeightKg?: number | null },
): string {
  if (usesBodyweight(set, options?.isPullup)) {
    const added = set.weight ?? 0
    const effective = getEffectiveLoad(set, options)
    const base = added > 0 ? `PDC + ${added} kg` : 'PDC'
    if (effective != null && effective > 0) {
      return `${base} (${effective} kg)`
    }
    return base
  }
  return formatWeight(set.weight)
}

export function formatRest(seconds: number): string {
  if (seconds <= 0) return 'Superset'
  if (seconds < 60) return `${seconds} s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `${m} min` : `${m} min ${s} s`
}

export function sessionVolume(session: WorkoutSession): number {
  return session.exercises.reduce((total, ex) => {
    if (ex.isTimed) return total
    return (
      total +
      ex.sets.reduce((sum, set) => {
        if (!set.completed || set.reps === null) return sum
        const load = getEffectiveLoad(set, { isPullup: ex.isPullup })
        if (load === null) return sum
        return sum + load * set.reps
      }, 0)
    )
  }, 0)
}

export function shouldStartRest(exercise: ExerciseLog): boolean {
  if (!exercise.supersetsGroup) {
    return exercise.restSeconds > 0
  }
  if (exercise.supersetsOrder === 1) {
    return false
  }
  return exercise.restSeconds > 0
}
