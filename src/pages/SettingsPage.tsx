import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Download,
  Moon,
  RefreshCw,
  Sun,
  Upload,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import {
  db,
  ensureSeeded,
  getProgram,
  getSettings,
  readProgram,
  readSettings,
  resetAllData,
} from '../db'
import { INITIAL_PROGRAM } from '../data/program'
import { RehabSettings } from '../rehab'
import type { ExportPayload, ThemeMode, WorkoutTemplate } from '../types'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [resetStep, setResetStep] = useState(0)
  const [editingWorkout, setEditingWorkout] = useState<string | null>(null)

  const settings = useLiveQuery(() => readSettings(), [])
  const program = useLiveQuery(() => readProgram(), [])

  async function saveRest(exerciseId: string, seconds: number) {
    const current = await getSettings()
    await db.settings.put({
      ...current,
      id: 1,
      restOverrides: {
        ...current.restOverrides,
        [exerciseId]: Math.max(0, seconds),
      },
    })
  }

  async function updateExercise(
    workoutId: string,
    exerciseId: string,
    patch: Partial<WorkoutTemplate['exercises'][number]>,
  ) {
    const current = await getProgram()
    const workouts = current.workouts.map((w) => {
      if (w.id !== workoutId) return w
      return {
        ...w,
        exercises: w.exercises.map((e) =>
          e.id === exerciseId ? { ...e, ...patch } : e,
        ),
      }
    })
    await db.program.put({ id: 1, workouts })
  }

  async function exportJson() {
    await ensureSeeded()
    const [s, p, sessions, rehabSessions] = await Promise.all([
      getSettings(),
      getProgram(),
      db.sessions.toArray(),
      db.rehabSessions.toArray(),
    ])
    const payload: ExportPayload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      settings: s,
      program: p,
      sessions,
      rehabSessions,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trackfit-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage('Export téléchargé.')
  }

  async function importJson(file: File) {
    try {
      const text = await file.text()
      const data = JSON.parse(text) as ExportPayload
      if (!data || (data.version !== 1 && data.version !== 2) || !Array.isArray(data.sessions)) {
        throw new Error('Fichier invalide')
      }
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
          if (data.settings) {
            await db.settings.put({ ...data.settings, id: 1 })
          }
          if (data.program?.workouts) {
            await db.program.put({ id: 1, workouts: data.program.workouts })
          }
          if (data.sessions.length) {
            await db.sessions.bulkAdd(
              data.sessions.map(({ id: _id, ...rest }) => rest),
            )
          }
          if (data.rehabSessions?.length) {
            await db.rehabSessions.bulkAdd(
              data.rehabSessions.map(({ id: _id, ...rest }) => rest),
            )
          }
        },
      )
      await ensureSeeded()
      if (data.settings?.theme) await setTheme(data.settings.theme)
      setMessage('Import réussi.')
    } catch {
      setMessage('Échec de l’import. Vérifie le fichier JSON.')
    }
  }

  async function handleReset() {
    if (resetStep === 0) {
      setResetStep(1)
      return
    }
    if (resetStep === 1) {
      setResetStep(2)
      return
    }
    await resetAllData()
    await setTheme('system')
    setResetStep(0)
    setMessage('Données réinitialisées.')
  }

  const themes: Array<{ id: ThemeMode; label: string; icon: typeof Sun }> = [
    { id: 'light', label: 'Clair', icon: Sun },
    { id: 'dark', label: 'Sombre', icon: Moon },
    { id: 'system', label: 'Système', icon: RefreshCw },
  ]

  return (
    <div className="space-y-5 pb-4 pt-2">
      <header>
        <h1 className="font-display text-3xl font-semibold">Réglages</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Thème, programme et sauvegardes
        </p>
      </header>

      {message && (
        <p className="rounded-2xl bg-[var(--color-accent-soft)] px-4 py-3 text-sm text-[var(--color-accent)]">
          {message}
        </p>
      )}

      <section className="rounded-3xl bg-[var(--color-surface-elevated)] p-4">
        <h2 className="font-display text-lg font-semibold">Poids du corps</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Utilisé pour les tractions et les séries cochées « Poids du corps »
        </p>
        <label className="mt-3 flex items-center gap-3">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="30"
            max="200"
            value={settings?.bodyWeightKg ?? ''}
            placeholder="ex. 55"
            onChange={(e) => {
              const value =
                e.target.value === '' ? null : Number(e.target.value)
              void (async () => {
                const current = await getSettings()
                await db.settings.put({
                  ...current,
                  id: 1,
                  bodyWeightKg: value,
                })
              })()
            }}
            className="min-h-14 w-28 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-center text-lg font-semibold tabular-nums"
          />
          <span className="text-sm font-medium text-[var(--color-ink-muted)]">
            kg
          </span>
        </label>
      </section>

      <section className="rounded-3xl bg-[var(--color-surface-elevated)] p-4">
        <h2 className="font-display text-lg font-semibold">Thème</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {themes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => void setTheme(id)}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl text-sm font-semibold ${
                theme === id
                  ? 'bg-[var(--color-accent)] text-white dark:text-[#062218]'
                  : 'bg-[var(--color-surface)]'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </section>

      <RehabSettings />

      <section className="rounded-3xl bg-[var(--color-surface-elevated)] p-4">
        <h2 className="font-display text-lg font-semibold">Temps de repos</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Surcharge les repos du programme (en secondes)
        </p>
        <div className="mt-3 space-y-2">
          {(program?.workouts ?? []).flatMap((w) =>
            w.exercises
              .filter((e) => e.restSeconds > 0 || e.supersetsOrder === 2)
              .map((e) => (
                <label
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--color-surface)] px-3 py-2"
                >
                  <span className="min-w-0 flex-1 text-sm leading-snug">
                    <span className="text-[var(--color-ink-muted)]">
                      {w.id} ·{' '}
                    </span>
                    {e.name}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    className="min-h-11 w-20 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-elevated)] text-center font-semibold tabular-nums"
                    value={
                      settings?.restOverrides[e.id] ?? e.restSeconds
                    }
                    onChange={(ev) =>
                      void saveRest(e.id, Number(ev.target.value) || 0)
                    }
                  />
                </label>
              )),
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-[var(--color-surface-elevated)] p-4">
        <h2 className="font-display text-lg font-semibold">
          Programme & objectifs
        </h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Modifier les exercices, séries et plages de répétitions
        </p>
        <div className="mt-3 space-y-2">
          {(program?.workouts ?? []).map((w) => (
            <div key={w.id}>
              <button
                type="button"
                onClick={() =>
                  setEditingWorkout((cur) => (cur === w.id ? null : w.id))
                }
                className="flex min-h-12 w-full items-center justify-between rounded-2xl bg-[var(--color-surface)] px-4 text-left font-semibold"
              >
                {w.name} — {w.subtitle}
                <span className="text-[var(--color-ink-muted)]">
                  {editingWorkout === w.id ? '−' : '+'}
                </span>
              </button>
              {editingWorkout === w.id && (
                <div className="mt-2 space-y-3">
                  {w.exercises.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-2xl border border-[var(--color-line)] p-3"
                    >
                      <input
                        type="text"
                        value={e.name}
                        onChange={(ev) =>
                          void updateExercise(w.id, e.id, {
                            name: ev.target.value,
                          })
                        }
                        className="mb-2 min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 font-semibold"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <Field
                          label="Séries"
                          value={e.sets}
                          onChange={(n) =>
                            void updateExercise(w.id, e.id, { sets: n })
                          }
                        />
                        <Field
                          label="Rep min"
                          value={e.repMin}
                          onChange={(n) =>
                            void updateExercise(w.id, e.id, { repMin: n })
                          }
                        />
                        <Field
                          label="Rep max"
                          value={e.repMax}
                          onChange={(n) =>
                            void updateExercise(w.id, e.id, { repMax: n })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={async () => {
            await db.program.put({
              id: 1,
              workouts: structuredClone(INITIAL_PROGRAM),
            })
            setMessage('Programme initial restauré.')
          }}
          className="mt-3 min-h-12 w-full rounded-2xl border border-[var(--color-line)] text-sm font-medium"
        >
          Restaurer le programme initial
        </button>
      </section>

      <section className="rounded-3xl bg-[var(--color-surface-elevated)] p-4">
        <h2 className="font-display text-lg font-semibold">Données</h2>
        <div className="mt-3 grid gap-2">
          <button
            type="button"
            onClick={() => void exportJson()}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--color-accent)] font-semibold text-white dark:text-[#062218]"
          >
            <Download size={18} />
            Exporter en JSON
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[var(--color-line)] font-semibold"
          >
            <Upload size={18} />
            Importer une sauvegarde
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void importJson(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => void handleReset()}
            onBlur={() => {
              if (resetStep > 0 && resetStep < 2) setResetStep(0)
            }}
            className="min-h-14 rounded-2xl border border-[var(--color-danger)] font-semibold text-[var(--color-danger)]"
          >
            {resetStep === 0 && 'Réinitialiser les données'}
            {resetStep === 1 && 'Confirmer la réinitialisation'}
            {resetStep === 2 && 'Dernière confirmation — tout effacer'}
          </button>
        </div>
      </section>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase text-[var(--color-ink-muted)]">
        {label}
      </span>
      <input
        type="number"
        min="1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 1)}
        className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-center font-semibold"
      />
    </label>
  )
}
