import { Minus, Pause, Play, Plus, X } from 'lucide-react'
import { useRestTimer } from '../context/RestTimerContext'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function RestTimerBar({ elevated = false }: { elevated?: boolean }) {
  const {
    isActive,
    isPaused,
    remaining,
    total,
    pause,
    resume,
    adjust,
    dismiss,
  } = useRestTimer()

  if (!isActive) return null

  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0

  return (
    <div
      className={`fixed left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 border-t border-[var(--color-line)] bg-[var(--color-surface-elevated)] px-4 pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] ${
        elevated ? 'bottom-[4.75rem]' : 'bottom-0 safe-bottom'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
            Repos
          </p>
          <p className="font-display text-3xl font-semibold tabular-nums text-[var(--color-accent)]">
            {formatTime(remaining)}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => adjust(-15)}
            className="inline-flex min-h-12 min-w-12 items-center justify-center gap-1 rounded-xl bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-ink)]"
            aria-label="Retirer 15 secondes"
          >
            <Minus size={16} />
            15
          </button>
          <button
            type="button"
            onClick={() => adjust(15)}
            className="inline-flex min-h-12 min-w-12 items-center justify-center gap-1 rounded-xl bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-ink)]"
            aria-label="Ajouter 15 secondes"
          >
            <Plus size={16} />
            15
          </button>
          <button
            type="button"
            onClick={isPaused ? resume : pause}
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-[var(--color-accent)] px-3 text-sm font-semibold text-white dark:text-[#062218]"
            aria-label={isPaused ? 'Reprendre' : 'Pause'}
          >
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-[var(--color-line)] px-3 text-sm font-semibold text-[var(--color-ink-muted)]"
            aria-label="Ignorer"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-line)]">
        <div
          className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
