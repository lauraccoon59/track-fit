import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { HeartPulse, History, Home, Settings, TrendingUp } from 'lucide-react'
import { RestTimerBar } from './RestTimerBar'
import { useRestTimer } from '../context/RestTimerContext'

const navItems = [
  { to: '/', label: 'Accueil', icon: Home, end: true },
  { to: '/reeducation', label: 'Kiné', icon: HeartPulse },
  { to: '/historique', label: 'Histo.', icon: History },
  { to: '/progression', label: 'Progrès', icon: TrendingUp },
  { to: '/reglages', label: 'Réglages', icon: Settings },
]

export function Layout() {
  const { isActive } = useRestTimer()
  const location = useLocation()
  const hideNav =
    location.pathname.startsWith('/seance') ||
    location.pathname.startsWith('/reeducation/circuit')

  return (
    <div className="flex min-h-full flex-col">
      <main
        className={`flex-1 overflow-x-hidden px-4 safe-top ${
          hideNav
            ? isActive
              ? 'pb-36'
              : 'pb-8'
            : isActive
              ? 'pb-52'
              : 'pb-24'
        }`}
      >
        <Outlet />
      </main>
      <RestTimerBar elevated={!hideNav} />
      {!hideNav && (
        <nav className="safe-bottom fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-surface-elevated)_92%,transparent)] backdrop-blur-md">
          <ul className="grid grid-cols-5 gap-0.5 px-1 py-2">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive: active }) =>
                    `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[10px] font-medium transition ${
                      active
                        ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                        : 'text-[var(--color-ink-muted)]'
                    }`
                  }
                >
                  <Icon size={20} strokeWidth={2.2} />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
