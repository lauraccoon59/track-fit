import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, HeartPulse, History, Play } from 'lucide-react'
import { readSettings } from '../../db'
import {
  DEFAULT_REHAB_CIRCUIT_ID,
  getRehabCircuit,
} from '../rehabProgram'
import {
  estimateCircuitMinutes,
  getInProgressRehab,
  resolveRehabSettings,
  startRehabSession,
} from '../rehab.service'
import { DEFAULT_REHAB_SETTINGS } from '../rehab.types'

export function RehabHome() {
  const navigate = useNavigate()
  const circuit = getRehabCircuit(DEFAULT_REHAB_CIRCUIT_ID)!

  const settings = useLiveQuery(async () => {
    const app = await readSettings()
    return resolveRehabSettings(app.rehab)
  }, [])

  const inProgress = useLiveQuery(() => getInProgressRehab(), [])

  const rehabSettings = settings ?? DEFAULT_REHAB_SETTINGS
  const estimated = estimateCircuitMinutes(rehabSettings)

  async function start() {
    const id = await startRehabSession()
    void navigate(`/reeducation/circuit/${id}`)
  }

  return (
    <div className="space-y-5 pb-4 pt-2">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          Rééducation
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          {circuit.name}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          {circuit.description}
        </p>
      </header>

      {inProgress?.id != null && (
        <button
          type="button"
          onClick={() => navigate(`/reeducation/circuit/${inProgress.id}`)}
          className="flex w-full items-center justify-between gap-3 rounded-3xl border border-[var(--color-accent)] bg-[var(--color-accent-soft)] p-4 text-left"
        >
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--color-accent)]">
              Circuit en cours
            </p>
            <p className="font-display text-lg font-semibold">
              {inProgress.circuitName}
            </p>
          </div>
          <ChevronRight className="text-[var(--color-accent)]" />
        </button>
      )}

      <section className="rounded-3xl bg-[var(--color-surface-elevated)] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <HeartPulse size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-semibold">{circuit.name}</p>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              {rehabSettings.rounds} tours · ~{estimated} min · repos{' '}
              {rehabSettings.restBetweenRoundsSeconds} s
            </p>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              Vélo {Math.round(rehabSettings.warmupSeconds / 60)} min puis{' '}
              {circuit.exercises.length} exercices
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void start()}
          className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-accent)] px-4 text-base font-semibold text-white dark:text-[#062218]"
        >
          <Play size={20} fill="currentColor" />
          Commencer le circuit
        </button>
      </section>

      <section className="rounded-3xl bg-[var(--color-surface-elevated)] p-4">
        <h2 className="font-display text-lg font-semibold">Déroulement</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--color-ink-muted)]">
          <li>Vélo {Math.round(rehabSettings.warmupSeconds / 60)} minutes</li>
          {circuit.exercises.map((ex) => (
            <li key={ex.id}>
              {ex.name}
              {ex.perSide ? ' (G puis D)' : ''}
            </li>
          ))}
          <li>× {rehabSettings.rounds} tours avec repos entre les tours</li>
        </ol>
      </section>

      <Link
        to="/reeducation/historique"
        className="flex min-h-14 items-center justify-between rounded-3xl bg-[var(--color-surface-elevated)] px-4 font-semibold"
      >
        <span className="inline-flex items-center gap-2">
          <History size={18} />
          Historique rééducation
        </span>
        <ChevronRight size={18} className="text-[var(--color-ink-muted)]" />
      </Link>
    </div>
  )
}
