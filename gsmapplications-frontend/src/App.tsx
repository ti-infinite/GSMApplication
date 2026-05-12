import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LocaleLayout from '@/layouts/LocaleLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import AuthGuard from '@/components/AuthGuard'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import ModulePage from '@/pages/ModulePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/en/login" replace />} />
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
        <Route path="*" element={<Navigate to="/en/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
