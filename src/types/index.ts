import type { RehabSession, RehabSettings } from '../rehab/rehab.types'

export type WorkoutLetter = 'A' | 'B' | 'C'
export type ThemeMode = 'light' | 'dark' | 'system'
export type ExerciseKind = 'main' | 'isolation' | 'isometric'
export type SessionStatus = 'in_progress' | 'completed' | 'abandoned'

export interface ExerciseTemplate {
  id: string
  name: string
  sets: number
  repMin: number
  repMax: number
  restSeconds: number
  kind: ExerciseKind
  cues: string[]
  heightAdaptations: string[]
  isTimed?: boolean
  perSide?: boolean
  isPullup?: boolean
  isLeg?: boolean
  supersetsGroup?: string
  supersetsOrder?: 1 | 2
  initialKnownSets?: Array<{ weight: number; reps: number }>
}

export interface WorkoutTemplate {
  id: WorkoutLetter
  name: string
  subtitle: string
  exercises: ExerciseTemplate[]
}

export interface SetLog {
  setNumber: number
  /** Charge machine, ou lest ajouté si useBodyweight */
  weight: number | null
  /** Inclure le poids du corps dans la charge effective */
  useBodyweight?: boolean
  /** Instantané du poids du corps au moment de la validation */
  bodyWeightKg?: number | null
  reps: number | null
  rir: number | null
  durationSeconds: number | null
  completed: boolean
}

export interface ExerciseLog {
  exerciseId: string
  exerciseName: string
  kind: ExerciseKind
  setsTarget: number
  repMin: number
  repMax: number
  restSeconds: number
  isTimed?: boolean
  perSide?: boolean
  isPullup?: boolean
  isLeg?: boolean
  supersetsGroup?: string
  supersetsOrder?: 1 | 2
  cues: string[]
  heightAdaptations: string[]
  sets: SetLog[]
  notes?: string
  reducedSets?: boolean
}

export interface PreCheck {
  fatigue: 1 | 2 | 3 | 4 | 5
  kneePain: boolean
  futsal24h: boolean
  match48h: boolean
}

export interface WorkoutSession {
  id?: number
  templateId: WorkoutLetter
  templateName: string
  startedAt: string
  completedAt?: string
  status: SessionStatus
  preCheck: PreCheck
  exercises: ExerciseLog[]
  notes?: string
  ignoredProgressions?: string[]
}

export interface AppSettings {
  id?: number
  theme: ThemeMode
  restOverrides: Record<string, number>
  /** Poids du corps en kg, utilisé pour les exercices au PDC */
  bodyWeightKg?: number | null
  /** Réglages du module rééducation */
  rehab?: RehabSettings
}

export interface ProgramState {
  id?: number
  workouts: WorkoutTemplate[]
}

export interface ExportPayload {
  version: 1 | 2
  exportedAt: string
  settings: AppSettings
  program: ProgramState
  sessions: WorkoutSession[]
  rehabSessions?: RehabSession[]
}

export type { RehabSession, RehabSettings }
