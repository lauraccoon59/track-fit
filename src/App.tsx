import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
} from 'react-router-dom'
import { Layout } from './components/Layout'
import { RestTimerProvider } from './context/RestTimerContext'
import { ThemeProvider } from './context/ThemeContext'
import { HistoryPage, SessionDetailPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { ProgressPage } from './pages/ProgressPage'
import { SettingsPage } from './pages/SettingsPage'
import { WorkoutPage } from './pages/WorkoutPage'
import { RehabHistory, RehabHome, RehabWorkout } from './rehab'

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Layout />}>
      <Route index element={<HomePage />} />
      <Route path="seance/:id" element={<WorkoutPage />} />
      <Route path="historique" element={<HistoryPage />} />
      <Route path="historique/:id" element={<SessionDetailPage />} />
      <Route path="progression" element={<ProgressPage />} />
      <Route path="reglages" element={<SettingsPage />} />
      <Route path="reeducation" element={<RehabHome />} />
      <Route path="reeducation/historique" element={<RehabHistory />} />
      <Route path="reeducation/circuit/:id" element={<RehabWorkout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>,
  ),
)

export default function App() {
  return (
    <ThemeProvider>
      <RestTimerProvider>
        <RouterProvider router={router} />
      </RestTimerProvider>
    </ThemeProvider>
  )
}
