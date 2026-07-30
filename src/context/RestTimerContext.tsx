import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

interface RestTimerContextValue {
  isActive: boolean
  isPaused: boolean
  remaining: number
  total: number
  start: (seconds: number) => void
  pause: () => void
  resume: () => void
  adjust: (delta: number) => void
  dismiss: () => void
}

const RestTimerContext = createContext<RestTimerContextValue | null>(null)

function notifyRestComplete() {
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200, 100, 200])
  }
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('TrackFit', {
        body: 'Temps de repos terminé',
        icon: '/pwa-192.png',
        silent: false,
      })
    }
  } catch {
    // Notifications may be blocked in standalone or unsupported contexts
  }

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
    // Audio may be blocked until user gesture
  }
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [remaining, setRemaining] = useState(0)
  const [total, setTotal] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const endAtRef = useRef<number | null>(null)
  const remainingOnPauseRef = useRef(0)

  const dismiss = useCallback(() => {
    setIsActive(false)
    setIsPaused(false)
    setRemaining(0)
    setTotal(0)
    endAtRef.current = null
  }, [])

  const start = useCallback((seconds: number) => {
    if (seconds <= 0) {
      dismiss()
      return
    }
    const s = Math.round(seconds)
    setTotal(s)
    setRemaining(s)
    setIsActive(true)
    setIsPaused(false)
    endAtRef.current = Date.now() + s * 1000

    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }, [dismiss])

  const pause = useCallback(() => {
    if (!isActive || isPaused) return
    remainingOnPauseRef.current = remaining
    endAtRef.current = null
    setIsPaused(true)
  }, [isActive, isPaused, remaining])

  const resume = useCallback(() => {
    if (!isActive || !isPaused) return
    endAtRef.current = Date.now() + remainingOnPauseRef.current * 1000
    setIsPaused(false)
  }, [isActive, isPaused])

  const adjust = useCallback(
    (delta: number) => {
      if (!isActive) return
      setRemaining((prev) => {
        const next = Math.max(0, prev + delta)
        remainingOnPauseRef.current = next
        if (!isPaused) {
          endAtRef.current = Date.now() + next * 1000
        }
        setTotal((t) => Math.max(t, next))
        return next
      })
    },
    [isActive, isPaused],
  )

  useEffect(() => {
    if (!isActive || isPaused) return

    const tick = () => {
      if (!endAtRef.current) return
      const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) {
        notifyRestComplete()
        setIsActive(false)
        setIsPaused(false)
        endAtRef.current = null
      }
    }

    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [isActive, isPaused])

  const value = useMemo(
    () => ({
      isActive,
      isPaused,
      remaining,
      total,
      start,
      pause,
      resume,
      adjust,
      dismiss,
    }),
    [isActive, isPaused, remaining, total, start, pause, resume, adjust, dismiss],
  )

  return (
    <RestTimerContext.Provider value={value}>
      {children}
    </RestTimerContext.Provider>
  )
}

export function useRestTimer(): RestTimerContextValue {
  const ctx = useContext(RestTimerContext)
  if (!ctx) throw new Error('useRestTimer must be used within RestTimerProvider')
  return ctx
}
