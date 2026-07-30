import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { SimpleChart } from '../components/SimpleChart'
import { db, readProgram } from '../db'
import { buildExerciseStats } from '../utils/progression'
import { formatDate, formatSetLoad, formatWeight } from '../utils/workout'

export function ProgressPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const data = useLiveQuery(async () => {
    const [program, sessions] = await Promise.all([
      readProgram(),
      db.sessions.where('status').equals('completed').toArray(),
    ])
    return { program, sessions }
  }, [])

  const exercises = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; isPullup?: boolean; isTimed?: boolean }
    >()
    for (const w of data?.program.workouts ?? []) {
      for (const e of w.exercises) {
        if (!map.has(e.id)) {
          map.set(e.id, {
            id: e.id,
            name: e.name,
            isPullup: e.isPullup,
            isTimed: e.isTimed,
          })
        }
      }
    }
    return [...map.values()]
  }, [data?.program])

  const activeId = selectedId ?? exercises[0]?.id ?? null
  const activeMeta = exercises.find((e) => e.id === activeId)

  const stats = useMemo(() => {
    if (!activeId || !activeMeta || !data) return null
    return buildExerciseStats(
      activeId,
      activeMeta.name,
      data.sessions,
      { isPullup: activeMeta.isPullup, isTimed: activeMeta.isTimed },
    )
  }, [activeId, activeMeta, data])

  const chartPoints =
    stats?.isPullup
      ? stats.pullupSessions.map((s) => ({
          label: formatDate(s.date),
          value: s.totalReps,
        }))
      : (stats?.history.map((h) => ({
          label: formatDate(h.date),
          value: stats.isTimed ? h.reps : h.weight || h.reps,
        })) ?? [])

  return (
    <div className="space-y-4 pb-4 pt-2">
      <header>
        <h1 className="font-display text-3xl font-semibold">Progression</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Performances par exercice
        </p>
      </header>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Exercice</span>
        <select
          value={activeId ?? ''}
          onChange={(e) => setSelectedId(e.target.value)}
          className="min-h-14 w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface-elevated)] px-4 text-base outline-none"
        >
          {exercises.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
              {e.isPullup ? ' ★' : ''}
            </option>
          ))}
        </select>
      </label>

      {stats && (
        <>
          <section className="grid grid-cols-2 gap-3">
            <Stat
              label={stats.isTimed ? 'Meilleure durée' : 'Meilleure charge'}
              value={
                stats.isTimed
                  ? `${stats.bestReps} s`
                  : formatWeight(stats.bestWeight)
              }
            />
            <Stat
              label={stats.isPullup ? 'Meilleur total' : 'Meilleures reps'}
              value={
                stats.isPullup
                  ? String(stats.pullupBestTotal)
                  : String(stats.bestReps || '—')
              }
            />
            <Stat
              label="Volume total"
              value={
                stats.isTimed
                  ? '—'
                  : `${Math.round(stats.totalVolume)} kg`
              }
            />
            <Stat
              label="Séances"
              value={String(stats.history.length)}
            />
          </section>

          <section className="rounded-3xl bg-[var(--color-surface-elevated)] p-4">
            <h2 className="font-display text-lg font-semibold">
              Évolution
            </h2>
            <p className="mb-2 text-xs text-[var(--color-ink-muted)]">
              {stats.isPullup
                ? 'Total de répétitions par séance'
                : stats.isTimed
                  ? 'Durée max par séance'
                  : 'Charge max (ou reps si PDC)'}
            </p>
            <SimpleChart
              points={chartPoints}
              unit={stats.isPullup ? '' : stats.isTimed ? 's' : ''}
            />
          </section>

          {stats.isPullup && (
            <section className="rounded-3xl bg-[var(--color-surface-elevated)] p-4">
              <h2 className="font-display text-lg font-semibold">
                Vue tractions
              </h2>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                Meilleur total : {stats.pullupBestTotal} répétitions
              </p>
              <ul className="mt-3 space-y-3">
                {[...stats.pullupSessions].reverse().map((s) => (
                  <li
                    key={s.date}
                    className="rounded-2xl bg-[var(--color-surface)] p-3"
                  >
                    <p className="text-xs font-medium text-[var(--color-ink-muted)]">
                      {formatDate(s.date)}
                    </p>
                    <p className="mt-1 text-sm">
                      Séries : {s.sets.map((x) => x.reps).join(' / ')}
                    </p>
                    <p className="text-sm">
                      Charge :{' '}
                      {s.sets
                        .map((x) => formatSetLoad(x, { isPullup: true }))
                        .join(' / ')}
                    </p>
                    <p className="text-sm">
                      Total : <strong>{s.totalReps}</strong> rep · max{' '}
                      {formatWeight(s.weight)}
                    </p>
                  </li>
                ))}
                {stats.pullupSessions.length === 0 && (
                  <p className="text-sm text-[var(--color-ink-muted)]">
                    Pas encore de séances de tractions enregistrées. Le résultat
                    initial (10, 9, 8, 8) apparaît sur l’accueil.
                  </p>
                )}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-[var(--color-surface-elevated)] p-4">
      <p className="text-xs text-[var(--color-ink-muted)]">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
        {value}
      </p>
    </div>
  )
}
