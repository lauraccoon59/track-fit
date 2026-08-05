interface PreRehabPromptProps {
  workoutLabel: string
  onYes: () => void
  onNo: () => void
  onCancel: () => void
}

export function PreRehabPrompt({
  workoutLabel,
  onYes,
  onNo,
  onCancel,
}: PreRehabPromptProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-[448px] rounded-3xl bg-[var(--color-surface-elevated)] p-5 shadow-xl">
        <h2 className="font-display text-xl font-semibold">Circuit Kiné</h2>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Souhaitez-vous effectuer votre Circuit Kiné avant {workoutLabel} ?
        </p>
        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={onYes}
            className="min-h-14 rounded-2xl bg-[var(--color-accent)] text-base font-semibold text-white dark:text-[#062218]"
          >
            Oui
          </button>
          <button
            type="button"
            onClick={onNo}
            className="min-h-14 rounded-2xl border border-[var(--color-line)] text-base font-semibold"
          >
            Non
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-2xl text-sm font-medium text-[var(--color-ink-muted)]"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
