import Dexie, { type EntityTable } from 'dexie'
import { INITIAL_PROGRAM } from '../data/program'
import type {
  AppSettings,
  ProgramState,
  WorkoutSession,
} from '../types'

class AthleticLogDB extends Dexie {
  sessions!: EntityTable<WorkoutSession, 'id'>
  settings!: EntityTable<AppSettings, 'id'>
  program!: EntityTable<ProgramState, 'id'>

  constructor() {
    super('athletic-log')
    this.version(1).stores({
      sessions: '++id, templateId, startedAt, completedAt, status',
      settings: 'id',
      program: 'id',
    })
  }
}

export const db = new AthleticLogDB()

const defaultSettings = (): AppSettings => ({
  id: 1,
  theme: 'system',
  restOverrides: {},
  bodyWeightKg: null,
})

const defaultProgram = (): ProgramState => ({
  id: 1,
  workouts: structuredClone(INITIAL_PROGRAM),
})

export async function ensureSeeded(): Promise<void> {
  const settingsCount = await db.settings.count()
  if (settingsCount === 0) {
    await db.settings.put(defaultSettings())
  }

  const programCount = await db.program.count()
  if (programCount === 0) {
    await db.program.put(defaultProgram())
  }
}

/** Lecture seule — ne pas appeler depuis useLiveQuery avec ensureSeeded. */
export async function readSettings(): Promise<AppSettings> {
  const settings = await db.settings.get(1)
  return settings ?? defaultSettings()
}

/** Lecture seule — ne pas appeler depuis useLiveQuery avec ensureSeeded. */
export async function readProgram(): Promise<ProgramState> {
  const program = await db.program.get(1)
  return program ?? defaultProgram()
}

export async function getSettings(): Promise<AppSettings> {
  await ensureSeeded()
  return readSettings()
}

export async function getProgram(): Promise<ProgramState> {
  await ensureSeeded()
  return readProgram()
}

export async function resetAllData(): Promise<void> {
  await db.transaction('rw', db.sessions, db.settings, db.program, async () => {
    await db.sessions.clear()
    await db.settings.clear()
    await db.program.clear()
  })
  await ensureSeeded()
}
