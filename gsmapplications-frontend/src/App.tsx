import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LocaleLayout from '@/layouts/LocaleLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import AuthGuard from '@/components/AuthGuard'
import ErrorBoundary from '@/components/ErrorBoundary'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import ModulePage from '@/pages/ModulePage'
import { getSavedLocale } from '@/hooks/useLocale'

export default function App() {
  const defaultLocale = getSavedLocale()
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to={`/${defaultLocale}/login`} replace />} />
          <Route path="/:locale" element={<LocaleLayout />}>
            <Route path="login" element={<LoginPage />} />
            <Route element={<AuthGuard />}>
              <Route path="dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="*" element={<ModulePage />} />
              </Route>
            </Route>
            <Route index element={<Navigate to="login" replace />} />
          </Route>
          <Route path="*" element={<Navigate to={`/${defaultLocale}/login`} replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}