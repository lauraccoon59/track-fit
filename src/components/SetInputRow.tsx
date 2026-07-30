import { Check, Copy } from 'lucide-react'
import type { SetLog } from '../types'
import { getEffectiveLoad } from '../utils/workout'

interface SetInputRowProps {
  set: SetLog
  isTimed?: boolean
  allowBodyweight?: boolean
  bodyWeightKg?: number | null
  onChange: (patch: Partial<SetLog>) => void
  onValidate: () => void
  onCopyWeight?: () => void
  showCopy?: boolean
}

export function SetInputRow({
  set,
  isTimed,
  allowBodyweight,
  bodyWeightKg,
  onChange,
  onValidate,
  onCopyWeight,
  showCopy,
}: SetInputRowProps) {
  const useBw = Boolean(allowBodyweight && set.useBodyweight)
  const hasBodyWeight = bodyWeightKg != null && bodyWeightKg > 0
  const effective =
    allowBodyweight
      ? getEffectiveLoad(set, {
          isPullup: true,
          fallbackBodyWeightKg: bodyWeightKg,
        })
      : set.weight

  const canValidate = isTimed
    ? set.durationSeconds !== null && set.durationSeconds > 0
    : set.reps !== null &&
      set.reps > 0 &&
      (allowBodyweight && useBw
        ? hasBodyWeight && set.weight !== null
        : allowBodyweight
          ? set.weight !== null
          : true)

  return (
    <div
      className={`rounded-2xl border p-3 ${
        set.completed
          ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)]'
          : 'border-[var(--color-line)] bg-[var(--color-surface)]'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">Série {set.setNumber}</p>
        {showCopy && onCopyWeight && !set.completed && (
          <button
            type="button"
            onClick={onCopyWeight}
            className="inline-flex min-h-10 items-center gap-1 rounded-xl px-2 text-xs font-medium text-[var(--color-accent)]"
          >
            <Copy size={14} />
            Copier S1
          </button>
        )}
      </div>

      {allowBodyweight && !isTimed && (
        <label className="mb-3 flex min-h-12 items-center gap-3 rounded-xl bg-[var(--color-surface-elevated)] px-3">
          <input
            type="checkbox"
            checked={useBw}
            disabled={set.completed}
            onChange={(e) =>
              onChange({
                useBodyweight: e.target.checked,
                weight: e.target.checked
                  ? (set.weight ?? 0)
                  : set.weight === 0
                    ? null
                    : set.weight,
                bodyWeightKg: e.target.checked ? null : null,
              })
            }
            className="h-5 w-5 accent-[var(--color-accent)]"
          />
          <span className="text-sm font-semibold">Poids du corps</span>
          {useBw && hasBodyWeight && (
            <span className="ml-auto text-xs text-[var(--color-ink-muted)]">
              {bodyWeightKg} kg
            </span>
          )}
        </label>
      )}

      {allowBodyweight && useBw && !hasBodyWeight && !set.completed && (
        <p className="mb-3 rounded-xl bg-[color-mix(in_oklab,var(--color-warn)_12%,transparent)] px-3 py-2 text-xs text-[var(--color-warn)]">
          Indique ton poids du corps dans Réglages pour valider cette série.
        </p>
      )}

      <div className={`grid gap-2 ${isTimed ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {!isTimed && (
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
              {useBw ? 'Lest' : 'Charge'}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              disabled={set.completed}
              value={set.weight ?? ''}
              placeholder={useBw ? '0' : 'kg'}
              onChange={(e) =>
                onChange({
                  weight:
                    e.target.value === '' ? null : Number(e.target.value),
                })
              }
              className="min-h-12 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-elevated)] px-3 text-center text-base font-semibold tabular-nums outline-none focus:border-[var(--color-accent)]"
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
            {isTimed ? 'Secondes' : 'Répétitions'}
          </span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            disabled={set.completed}
            value={
              isTimed
                ? (set.durationSeconds ?? '')
                : (set.reps ?? '')
            }
            onChange={(e) => {
              const n = e.target.value === '' ? null : Number(e.target.value)
              if (isTimed) onChange({ durationSeconds: n, reps: n })
              else onChange({ reps: n })
            }}
            className="min-h-12 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-elevated)] px-3 text-center text-base font-semibold tabular-nums outline-none focus:border-[var(--color-accent)]"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
            RIR
          </span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="10"
            disabled={set.completed}
            value={set.rir ?? ''}
            placeholder="opt."
            onChange={(e) =>
              onChange({
                rir: e.target.value === '' ? null : Number(e.target.value),
              })
            }
            className="min-h-12 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-elevated)] px-3 text-center text-base font-semibold tabular-nums outline-none focus:border-[var(--color-accent)]"
          />
        </label>
      </div>

      {allowBodyweight && useBw && hasBodyWeight && !isTimed && (
        <p className="mt-2 text-center text-xs text-[var(--color-ink-muted)]">
          Charge totale :{' '}
          <span className="font-semibold text-[var(--color-ink)]">
            {effective ?? '—'} kg
          </span>
          {(set.weight ?? 0) > 0
            ? ` (${bodyWeightKg} + ${set.weight})`
            : ` (poids du corps)`}
        </p>
      )}

      {!set.completed && (
        <button
          type="button"
          disabled={!canValidate}
          onClick={onValidate}
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] text-sm font-semibold text-white disabled:opacity-40 dark:text-[#062218]"
        >
          <Check size={18} />
          Valider la série
        </button>
      )}
      {set.completed && (
        <p className="mt-2 text-center text-xs font-medium text-[var(--color-accent)]">
          Série validée
          {effective != null ? ` · ${effective} kg` : ''}
        </p>
      )}
    </div>
  )
}
