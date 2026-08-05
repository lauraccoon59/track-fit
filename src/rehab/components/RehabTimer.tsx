import { useCallback, useEffect, useRef, useState } from 'react'
import { Minus, Pause, Play, Plus, X } from 'lucide-react'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function notifyComplete(options: {
  soundEnabled: boolean
  vibrationEnabled: boolean
  message?: string
}) {
  if (options.vibrationEnabled && navigator.vibrate) {
    navigator.vibrate([200, 100, 200])
  }
  if (!options.soundEnabled) return
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.value = 0.08
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    setTimeout(() => {
      osc.stop()
      void ctx.close()
    }, 350)
  } catch {
    // ignore
  }
}

interface RehabTimerProps {
  seconds: number
  label?: string
  autoStart?: boolean
  soundEnabled?: boolean
  vibrationEnabled?: boolean
  onComplete: () => void
  onSkip?: () => void
  compact?: boolean
}

export function RehabTimer({
  seconds,
  label,
  autoStart = true,
  soundEnabled = true,
  vibrationEnabled = true,
  onComplete,
  onSkip,
  compact = false,
}: RehabTimerProps) {
  const [remaining, setRemaining] = useState(seconds)
  const [total] = useState(seconds)
  const [isPaused, setIsPaused] = useState(!autoStart)
  const [isDone, setIsDone] = useState(false)
  const endAtRef = useRef<number | null>(
    autoStart ? Date.now() + seconds * 1000 : null,
  )
  const remainingOnPauseRef = useRef(seconds)
  const completedRef = useRef(false)

  // Reset when seconds prop changes (new exercise)
  useEffect(() => {
    completedRef.current = false
    setIsDone(false)
    setRemaining(seconds)
    remainingOnPauseRef.current = seconds
    setIsPaused(!autoStart)
    endAtRef.current = autoStart ? Date.now() + seconds * 1000 : null
  }, [seconds, autoStart])

  const finish = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    setIsDone(true)
    setRemaining(0)
    endAtRef.current = null
    notifyComplete({ soundEnabled, vibrationEnabled })
    onComplete()
  }, [onComplete, soundEnabled, vibrationEnabled])

  useEffect(() => {
    if (isPaused || isDone) return
    const tick = () => {
      if (!endAtRef.current) return
      const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) finish()
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [isPaused, isDone, finish])

  const pause = () => {
    remainingOnPauseRef.current = remaining
    endAtRef.current = null
    setIsPaused(true)
  }

  const resume = () => {
    endAtRef.current = Date.now() + remainingOnPauseRef.current * 1000
    setIsPaused(false)
  }

  const adjust = (delta: number) => {
    setRemaining((prev) => {
      const next = Math.max(0, prev + delta)
      remainingOnPauseRef.current = next
      if (!isPaused) endAtRef.current = Date.now() + next * 1000
      return next
    })
  }

  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0

  return (
    <div
      className={`rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface-elevated)] ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      {label && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          {label}
        </p>
      )}
      <p
        className={`font-display font-semibold tabular-nums text-[var(--color-accent)] ${
          compact ? 'text-3xl' : 'text-5xl'
        }`}
      >
        {formatTime(remaining)}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-line)]">
        <div
          className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => adjust(-15)}
          className="inline-flex min-h-12 items-center gap-1 rounded-xl bg-[var(--color-surface)] px-3 text-sm font-semibold"
        >
          <Minus size={16} /> 15
        </button>
        <button
          type="button"
          onClick={() => adjust(15)}
          className="inline-flex min-h-12 items-center gap-1 rounded-xl bg-[var(--color-surface)] px-3 text-sm font-semibold"
        >
          <Plus size={16} /> 15
        </button>
        <button
          type="button"
          onClick={isPaused ? resume : pause}
          className="inline-flex min-h-12 items-center gap-1 rounded-xl bg-[var(--color-accent)] px-3 text-sm font-semibold text-white dark:text-[#062218]"
        >
          {isPaused ? <Play size={16} /> : <Pause size={16} />}
          {isPaused ? 'Reprendre' : 'Pause'}
        </button>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex min-h-12 items-center gap-1 rounded-xl border border-[var(--color-line)] px-3 text-sm font-semibold text-[var(--color-ink-muted)]"
          >
            <X size={16} /> Ignorer
          </button>
        )}
      </div>
    </div>
  )
}
