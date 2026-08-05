import { db, getSettings } from '../db'
import {
  DEFAULT_REHAB_CIRCUIT_ID,
  getRehabCircuit,
} from './rehabProgram'
import {
  DEFAULT_REHAB_SETTINGS,
  type RehabCircuitTemplate,
  type RehabExerciseProgress,
  type RehabPhase,
  type RehabRoundLog,
  type RehabSession,
  type RehabSettings,
} from './rehab.types'

export function resolveRehabSettings(
  stored?: Partial<RehabSettings> | null,
): RehabSettings {
  return { ...DEFAULT_REHAB_SETTINGS, ...stored }
}

export async function readRehabSettings(): Promise<RehabSettings> {
  const settings = await getSettings()
  return resolveRehabSettings(settings.rehab)
}

export async function saveRehabSettings(
  patch: Partial<RehabSettings>,
): Promise<RehabSettings> {
  const current = await getSettings()
  const rehab = resolveRehabSettings({ ...current.rehab, ...patch })
  await db.settings.put({ ...current, id: 1, rehab })
  return rehab
}

function emptyExerciseProgress(
  circuit: RehabCircuitTemplate,
): RehabExerciseProgress[] {
  return circuit.exercises.map((ex) => ({
    exerciseId: ex.id,
    completed: false,
    leftCompleted: false,
    rightCompleted: false,
    repsLeft: 0,
    repsRight: 0,
  }))
}

function emptyRounds(
  circuit: RehabCircuitTemplate,
  rounds: number,
): RehabRoundLog[] {
  return Array.from({ length: rounds }, (_, i) => ({
    roundNumber: i + 1,
    completed: false,
    skipped: false,
    exercises: emptyExerciseProgress(circuit),
  }))
}

export async function startRehabSession(options?: {
  circuitId?: string
  returnToWorkoutId?: number
}): Promise<number> {
  const circuitId = options?.circuitId ?? DEFAULT_REHAB_CIRCUIT_ID
  const circuit = getRehabCircuit(circuitId)
  if (!circuit) throw new Error(`Circuit inconnu: ${circuitId}`)

  const rehabSettings = await readRehabSettings()
  const roundsTarget = rehabSettings.rounds
  const warmupSeconds = rehabSettings.warmupSeconds

  const existing = await db.rehabSessions
    .where('status')
    .equals('in_progress')
    .first()
  if (existing?.id != null) {
    await db.rehabSessions.update(existing.id, { status: 'abandoned' })
  }

  const session: Omit<RehabSession, 'id'> = {
    circuitId: circuit.id,
    circuitName: circuit.name,
    startedAt: new Date().toISOString(),
    status: 'in_progress',
    roundsTarget,
    roundsCompleted: 0,
    roundsSkipped: 0,
    restSecondsUsed: rehabSettings.restBetweenRoundsSeconds,
    warmupSeconds,
    warmupCompleted: false,
    currentPhase: { type: 'warmup' },
    rounds: emptyRounds(circuit, roundsTarget),
    returnToWorkoutId: options?.returnToWorkoutId,
  }

  const id = await db.rehabSessions.add(session)
  return id as number
}

export async function getRehabSession(
  id: number,
): Promise<RehabSession | undefined> {
  return db.rehabSessions.get(id)
}

export async function updateRehabSession(
  id: number,
  patch: Partial<RehabSession>,
): Promise<void> {
  await db.rehabSessions.update(id, patch)
}

export async function completeRehabSession(id: number): Promise<void> {
  const session = await db.rehabSessions.get(id)
  if (!session) return
  const ended = new Date()
  const started = new Date(session.startedAt)
  const totalDurationSeconds = Math.max(
    0,
    Math.round((ended.getTime() - started.getTime()) / 1000),
  )
  await db.rehabSessions.update(id, {
    status: 'completed',
    completedAt: ended.toISOString(),
    currentPhase: { type: 'finished' },
    totalDurationSeconds,
    roundsCompleted: session.rounds.filter((r) => r.completed).length,
    roundsSkipped: session.rounds.filter((r) => r.skipped).length,
  })
}

export async function abandonRehabSession(id: number): Promise<void> {
  await db.rehabSessions.update(id, {
    status: 'abandoned',
    completedAt: new Date().toISOString(),
  })
}

export async function listRehabSessions(): Promise<RehabSession[]> {
  return db.rehabSessions.orderBy('startedAt').reverse().toArray()
}

export async function deleteRehabSession(id: number): Promise<void> {
  await db.rehabSessions.delete(id)
}

export async function getInProgressRehab(): Promise<RehabSession | undefined> {
  return db.rehabSessions.where('status').equals('in_progress').first()
}

/** Prochaine phase après validation d’un exercice / côté. */
export function advanceAfterExerciseComplete(
  session: RehabSession,
  circuit: RehabCircuitTemplate,
): RehabPhase {
  const phase = session.currentPhase
  if (phase.type !== 'exercise') return phase

  const { round, exerciseIndex } = phase
  const exercise = circuit.exercises[exerciseIndex]
  const roundLog = session.rounds[round - 1]
  const progress = roundLog?.exercises[exerciseIndex]

  if (exercise?.perSide && phase.side === 'left' && !progress?.rightCompleted) {
    return { type: 'exercise', round, exerciseIndex, side: 'right' }
  }

  const nextIndex = exerciseIndex + 1
  if (nextIndex < circuit.exercises.length) {
    const next = circuit.exercises[nextIndex]
    return {
      type: 'exercise',
      round,
      exerciseIndex: nextIndex,
      side: next.perSide ? 'left' : 'none',
    }
  }

  return { type: 'round_complete', round }
}

export function phaseAfterWarmup(circuit: RehabCircuitTemplate): RehabPhase {
  const first = circuit.exercises[0]
  return {
    type: 'exercise',
    round: 1,
    exerciseIndex: 0,
    side: first?.perSide ? 'left' : 'none',
  }
}

export function phaseAfterRest(
  afterRound: number,
  roundsTarget: number,
  circuit: RehabCircuitTemplate,
): RehabPhase {
  if (afterRound >= roundsTarget) {
    return { type: 'finished' }
  }
  const first = circuit.exercises[0]
  return {
    type: 'exercise',
    round: afterRound + 1,
    exerciseIndex: 0,
    side: first?.perSide ? 'left' : 'none',
  }
}

export function estimateCircuitMinutes(settings: RehabSettings): number {
  // Vélo + ~4–5 min par tour + repos
  const perRound = 4.5
  const restMin = (settings.restBetweenRoundsSeconds / 60) * Math.max(0, settings.rounds - 1)
  return Math.round(settings.warmupSeconds / 60 + settings.rounds * perRound + restMin)
}

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m === 0) return `${s} s`
  if (s === 0) return `${m} min`
  return `${m} min ${s} s`
}
