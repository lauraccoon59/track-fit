import { useLiveQuery } from 'dexie-react-hooks'
import { readSettings } from '../../db'
import {
  resolveRehabSettings,
  saveRehabSettings,
} from '../rehab.service'
import type { RehabSettings } from '../rehab.types'

export function RehabSettings() {
  const settings = useLiveQuery(async () => {
    const app = await readSettings()
    return resolveRehabSettings(app.rehab)
  }, [])

  if (!settings) {
    return (
      <p className="text-sm text-[var(--color-ink-muted)]">Chargement…</p>
    )
  }

  async function update(patch: Partial<RehabSettings>) {
    await saveRehabSettings(patch)
  }

  return (
    <section className="rounded-3xl bg-[var(--color-surface-elevated)] p-4">
      <h2 className="font-display text-lg font-semibold">Circuit Kiné</h2>
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
        Réglages du module de rééducation (indépendant de la musculation)
      </p>

      <div className="mt-4 space-y-3">
        <NumberField
          label="Nombre de tours"
          value={settings.rounds}
          min={1}
          max={10}
          onChange={(n) => void update({ rounds: n })}
        />
        <NumberField
          label="Durée du vélo (minutes)"
          value={Math.round(settings.warmupSeconds / 60)}
          min={1}
          max={20}
          onChange={(n) => void update({ warmupSeconds: n * 60 })}
        />
        <NumberField
          label="Repos entre tours (secondes)"
          value={settings.restBetweenRoundsSeconds}
          min={0}
          max={300}
          step={15}
          onChange={(n) => void update({ restBetweenRoundsSeconds: n })}
        />

        <Toggle
          label="Afficher les illustrations"
          checked={settings.showIllustrations}
          onChange={(v) => void update({ showIllustrations: v })}
        />
        <Toggle
          label="Son de fin de chronomètre"
          checked={settings.soundEnabled}
          onChange={(v) => void update({ soundEnabled: v })}
        />
        <Toggle
          label="Vibration"
          checked={settings.vibrationEnabled}
          onChange={(v) => void update({ vibrationEnabled: v })}
        />
      </div>
    </section>
  )
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (n: number) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--color-surface)] px-3 py-2">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || min)}
        className="min-h-11 w-24 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-elevated)] text-center font-semibold tabular-nums"
      />
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center justify-between rounded-2xl bg-[var(--color-surface)] px-3 text-left text-sm font-medium"
    >
      {label}
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          checked
            ? 'bg-[var(--color-accent)] text-white dark:text-[#062218]'
            : 'bg-[var(--color-line)] text-[var(--color-ink-muted)]'
        }`}
      >
        {checked ? 'Oui' : 'Non'}
      </span>
    </button>
  )
}
