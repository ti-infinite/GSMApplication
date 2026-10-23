import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LocaleLayout from '@/layouts/LocaleLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import AuthGuard from '@/shared/components/AuthGuard'
import ErrorBoundary from '@/shared/components/ErrorBoundary'
import NotFound from '@/shared/components/NotFound'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import ModulePage from '@/pages/ModulePage'
import QueryProvider from '@/app/providers/QueryProvider'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { Toaster } from 'sonner'
import { getSavedLocale } from '@/shared/hooks/useLocale'
import { isSessionActive } from '@/shared/lib/auth'

export default function App() {
  const defaultLocale = getSavedLocale()
  return (
    <ErrorBoundary>
      <QueryProvider>
      <TooltipProvider delayDuration={150}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to={`/${defaultLocale}/login`} replace />} />
          <Route path="/:locale" element={<LocaleLayout />}>
            <Route path="login" element={<LoginPage />} />
            {/* Outside AuthGuard: the guard redirects here when the password change is
                required, so guarding it too would render nothing. */}
            <Route path="change-password" element={<LoginPage forcedPasswordChange />} />
            <Route element={<AuthGuard />}>
              <Route path="dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="*" element={<ModulePage />} />
              </Route>
              {/* Authenticated user on an unknown route under the locale → show the
                  404 (its button goes home). No-session is handled by AuthGuard → login. */}
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route index element={<Navigate to="login" replace />} />
          </Route>
          {/* No valid locale: go to dashboard if there's a session, login otherwise. */}
          <Route
            path="*"
            element={<Navigate to={`/${defaultLocale}/${isSessionActive() ? 'dashboard' : 'login'}`} replace />}
          />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-center" expand />
      </TooltipProvider>
      </QueryProvider>
    </ErrorBoundary>
  )
}