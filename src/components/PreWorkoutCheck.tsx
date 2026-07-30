import type { PreCheck } from '../types'
import { shouldShowRecommendation } from '../utils/workout'

interface PreWorkoutCheckProps {
  value: PreCheck
  onChange: (value: PreCheck) => void
  onConfirm: () => void
  onCancel: () => void
  workoutLabel: string
}

export function PreWorkoutCheck({
  value,
  onChange,
  onConfirm,
  onCancel,
  workoutLabel,
}: PreWorkoutCheckProps) {
  const showAdvice = shouldShowRecommendation(value)

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="max-h-[90dvh] w-full max-w-[448px] overflow-y-auto rounded-3xl bg-[var(--color-surface-elevated)] p-5 shadow-xl">
        <h2 className="font-display text-xl font-semibold">Bilan rapide</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Avant {workoutLabel}
        </p>

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-semibold">
            Fatigue générale (1–5)
          </legend>
          <div className="grid grid-cols-5 gap-2">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange({ ...value, fatigue: n })}
                className={`min-h-14 rounded-2xl text-lg font-semibold transition ${
                  value.fatigue === n
                    ? 'bg-[var(--color-accent)] text-white dark:text-[#062218]'
                    : 'bg-[var(--color-surface)] text-[var(--color-ink)]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        <YesNo
          label="Douleurs aux genoux"
          value={value.kneePain}
          onChange={(kneePain) => onChange({ ...value, kneePain })}
        />
        <YesNo
          label="Futsal dans les dernières 24 h"
          value={value.futsal24h}
          onChange={(futsal24h) => onChange({ ...value, futsal24h })}
        />
        <YesNo
          label="Match dans les prochaines 48 h"
          value={value.match48h}
          onChange={(match48h) => onChange({ ...value, match48h })}
        />

        {showAdvice && (
          <div className="mt-4 rounded-2xl border border-[var(--color-warn)]/40 bg-[color-mix(in_oklab,var(--color-warn)_12%,transparent)] p-4 text-sm">
            <p className="font-semibold text-[var(--color-warn)]">
              Recommandation (non bloquante)
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[var(--color-ink)]">
              <li>Réduire d’une série les exercices de jambes</li>
              <li>Conserver 2 à 3 répétitions en réserve</li>
              <li>Ne pas chercher de record</li>
              <li>Diminuer légèrement la charge si nécessaire</li>
            </ul>
          </div>
        )}

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-14 rounded-2xl bg-[var(--color-accent)] px-4 text-base font-semibold text-white dark:text-[#062218]"
          >
            Commencer la séance
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-2xl border border-[var(--color-line)] px-4 text-sm font-medium text-[var(--color-ink-muted)]"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-semibold">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`min-h-14 rounded-2xl text-base font-semibold ${
            value
              ? 'bg-[var(--color-accent)] text-white dark:text-[#062218]'
              : 'bg-[var(--color-surface)]'
          }`}
        >
          Oui
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`min-h-14 rounded-2xl text-base font-semibold ${
            !value
              ? 'bg-[var(--color-accent)] text-white dark:text-[#062218]'
              : 'bg-[var(--color-surface)]'
          }`}
        >
          Non
        </button>
      </div>
    </div>
  )
}
