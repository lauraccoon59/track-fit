/** Types du module rééducation — indépendant de la musculation. */

export type RehabExerciseMode = 'warmup' | 'hold' | 'reps'

export interface RehabExerciseTemplate {
  id: string
  name: string
  mode: RehabExerciseMode
  cues: string[]
  description?: string
  /** Clé d’illustration (placeholder extensible) */
  illustrationKey?: string
  /** Durée d’un maintien (secondes) */
  holdSeconds?: number
  /** Répétitions cibles par côté / total */
  repsTarget?: number
  /** Exécuter gauche puis droite */
  perSide?: boolean
}

export interface RehabCircuitTemplate {
  id: string
  name: string
  description: string
  defaultRounds: number
  defaultWarmupSeconds: number
  defaultRestBetweenRoundsSeconds: number
  /** Estimation affichée (minutes) */
  estimatedMinutes: number
  warmup: RehabExerciseTemplate
  exercises: RehabExerciseTemplate[]
}

export type RehabSessionStatus = 'in_progress' | 'completed' | 'abandoned'

export type RehabPhase =
  | { type: 'warmup' }
  | {
      type: 'exercise'
      round: number
      exerciseIndex: number
      side: 'left' | 'right' | 'none'
    }
  | { type: 'round_complete'; round: number }
  | { type: 'rest'; afterRound: number }
  | { type: 'finished' }

export interface RehabExerciseProgress {
  exerciseId: string
  completed: boolean
  leftCompleted?: boolean
  rightCompleted?: boolean
  repsLeft?: number
  repsRight?: number
  skipped?: boolean
}

export interface RehabRoundLog {
  roundNumber: number
  completed: boolean
  skipped?: boolean
  exercises: RehabExerciseProgress[]
}

export interface RehabSession {
  id?: number
  circuitId: string
  circuitName: string
  startedAt: string
  completedAt?: string
  status: RehabSessionStatus
  roundsTarget: number
  roundsCompleted: number
  roundsSkipped: number
  restSecondsUsed: number
  warmupSeconds: number
  warmupCompleted: boolean
  currentPhase: RehabPhase
  rounds: RehabRoundLog[]
  notes?: string
  /** Si lancé avant une séance de musculation */
  returnToWorkoutId?: number
  totalDurationSeconds?: number
}

export interface RehabSettings {
  rounds: number
  warmupSeconds: number
  restBetweenRoundsSeconds: number
  showIllustrations: boolean
  soundEnabled: boolean
  vibrationEnabled: boolean
}

export const DEFAULT_REHAB_SETTINGS: RehabSettings = {
  rounds: 5,
  warmupSeconds: 5 * 60,
  restBetweenRoundsSeconds: 90,
  showIllustrations: true,
  soundEnabled: true,
  vibrationEnabled: true,
}
