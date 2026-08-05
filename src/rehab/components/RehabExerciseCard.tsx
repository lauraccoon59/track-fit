import { Check, ImageIcon, Minus, Plus } from 'lucide-react'
import type { RehabExerciseTemplate } from '../rehab.types'
import { RehabTimer } from './RehabTimer'

interface RehabExerciseCardProps {
  exercise: RehabExerciseTemplate
  side: 'left' | 'right' | 'none'
  showIllustration: boolean
  soundEnabled: boolean
  vibrationEnabled: boolean
  repsCount?: number
  onRepsChange?: (n: number) => void
  onHoldComplete: () => void
  onMarkDone: () => void
  completed?: boolean
}

function sideLabel(side: 'left' | 'right' | 'none'): string | null {
  if (side === 'left') return 'Jambe gauche'
  if (side === 'right') return 'Jambe droite'
  return null
}

export function RehabExerciseCard({
  exercise,
  side,
  showIllustration,
  soundEnabled,
  vibrationEnabled,
  repsCount = 0,
  onRepsChange,
  onHoldComplete,
  onMarkDone,
  completed,
}: RehabExerciseCardProps) {
  const label = sideLabel(side)
  const holdSeconds = exercise.holdSeconds ?? 30
  const repsTarget = exercise.repsTarget ?? 15

  return (
    <section className="space-y-3 rounded-3xl bg-[var(--color-surface-elevated)] p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          {exercise.mode === 'warmup' ? 'Échauffement' : 'Exercice'}
          {label ? ` · ${label}` : ''}
        </p>
        <h2 className="mt-1 font-display text-xl font-semibold leading-tight">
          {exercise.name}
        </h2>
        {exercise.description && (
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            {exercise.description}
          </p>
        )}
      </div>

      {showIllustration && (
        <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-muted)]">
          <ImageIcon size={36} strokeWidth={1.5} />
          <p className="mt-2 text-xs font-medium">
            Illustration — {exercise.illustrationKey ?? exercise.id}
          </p>
        </div>
      )}

      <div className="rounded-2xl bg-[var(--color-surface)] p-3">
        <p className="text-sm font-semibold">Consignes</p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-[var(--color-ink-muted)]">
          {exercise.cues.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>

      {completed ? (
        <p className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--color-accent-soft)] font-semibold text-[var(--color-accent)]">
          <Check size={18} /> Terminé
        </p>
      ) : (
        <>
          {(exercise.mode === 'hold' || exercise.mode === 'warmup') && (
            <RehabTimer
              key={`${exercise.id}-${side}-${holdSeconds}`}
              seconds={holdSeconds}
              label={
                exercise.mode === 'warmup'
                  ? 'Vélo'
                  : label
                    ? `Maintien · ${label}`
                    : 'Maintien'
              }
              soundEnabled={soundEnabled}
              vibrationEnabled={vibrationEnabled}
              onComplete={onHoldComplete}
              onSkip={onHoldComplete}
            />
          )}

          {exercise.mode === 'reps' && (
            <div className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                Répétitions{label ? ` · ${label}` : ''} · objectif {repsTarget}
              </p>
              <div className="mt-3 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => onRepsChange?.(Math.max(0, repsCount - 1))}
                  className="inline-flex min-h-14 min-w-14 items-center justify-center rounded-2xl bg-[var(--color-surface-elevated)]"
                  aria-label="Retirer une répétition"
                >
                  <Minus size={22} />
                </button>
                <span className="font-display text-5xl font-semibold tabular-nums">
                  {repsCount}
                </span>
                <button
                  type="button"
                  onClick={() => onRepsChange?.(repsCount + 1)}
                  className="inline-flex min-h-14 min-w-14 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-white dark:text-[#062218]"
                  aria-label="Ajouter une répétition"
                >
                  <Plus size={22} />
                </button>
              </div>
              <button
                type="button"
                disabled={repsCount < repsTarget}
                onClick={onMarkDone}
                className="mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-accent)] font-semibold text-white disabled:opacity-40 dark:text-[#062218]"
              >
                <Check size={18} />
                Valider {label ?? 'cet exercice'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
