import Dexie, { type EntityTable } from 'dexie'
import { INITIAL_PROGRAM } from '../data/program'
import { DEFAULT_REHAB_SETTINGS } from '../rehab/rehab.types'
import type { RehabSession } from '../rehab/rehab.types'
import type {
  AppSettings,
  ProgramState,
  WorkoutSession,
} from '../types'

class AthleticLogDB extends Dexie {
  sessions!: EntityTable<WorkoutSession, 'id'>
  settings!: EntityTable<AppSettings, 'id'>
  program!: EntityTable<ProgramState, 'id'>
  rehabSessions!: EntityTable<RehabSession, 'id'>

  constructor() {
    super('athletic-log')
    this.version(1).stores({
      sessions: '++id, templateId, startedAt, completedAt, status',
      settings: 'id',
      program: 'id',
    })
    this.version(2)
      .stores({
        sessions: '++id, templateId, startedAt, completedAt, status',
        settings: 'id',
        program: 'id',
        rehabSessions: '++id, circuitId, startedAt, completedAt, status',
      })
      .upgrade(async (tx) => {
        const settingsTable = tx.table('settings')
        const existing = (await settingsTable.get(1)) as AppSettings | undefined
        if (existing && !existing.rehab) {
          await settingsTable.put({
            ...existing,
            rehab: { ...DEFAULT_REHAB_SETTINGS },
          })
        }
      })
  }
}

export const db = new AthleticLogDB()

const defaultSettings = (): AppSettings => ({
  id: 1,
  theme: 'system',
  restOverrides: {},
  bodyWeightKg: null,
  rehab: { ...DEFAULT_REHAB_SETTINGS },
})

const defaultProgram = (): ProgramState => ({
  id: 1,
  workouts: structuredClone(INITIAL_PROGRAM),
})

export async function ensureSeeded(): Promise<void> {
  const settingsCount = await db.settings.count()
  if (settingsCount === 0) {
    await db.settings.put(defaultSettings())
  } else {
    const settings = await db.settings.get(1)
    if (settings && !settings.rehab) {
      await db.settings.put({
        ...settings,
        rehab: { ...DEFAULT_REHAB_SETTINGS },
      })
    }
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
  await db.transaction(
    'rw',
    db.sessions,
    db.settings,
    db.program,
    db.rehabSessions,
    async () => {
      await db.sessions.clear()
      await db.settings.clear()
      await db.program.clear()
      await db.rehabSessions.clear()
    },
  )
  await ensureSeeded()
}
