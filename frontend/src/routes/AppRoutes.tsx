import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from '../modules/auth/pages/LoginPage'
import { RegisterPage } from '../modules/auth/pages/RegisterPage'
import { DashboardPage } from '../modules/dashboard/pages/DashboardPage'
import { ClientsPage } from '../modules/clients/pages/ClientsPage'
import { ClientDetailPage } from '../modules/clients/pages/ClientDetailPage'
import { CollaboratorsPage } from '../modules/collaborators/pages/CollaboratorsPage'
import { SettingsPage } from '../modules/settings/pages/SettingsPage'
import { HistoryPage } from '../modules/history/pages/HistoryPage'
import { SchedulePage } from '../modules/schedule/pages/SchedulePage'
import { Layout } from '../shared/components/Layout'
import { useAuthStore } from '../shared/stores/useAuthStore'
import { useMyPermissions } from '../shared/hooks/useMyPermissions'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (token) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function PermissionRoute({ children, module }: { children: React.ReactNode; module: string }) {
  const { permissions, isAdmin, isLoading } = useMyPermissions()
  if (isLoading) return null
  if (isAdmin) return <>{children}</>
  const canRead = permissions.some((p) => p.module === module && p.action === 'read' && p.allowed)
  if (!canRead) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route
          path="schedule"
          element={
            <PermissionRoute module="schedule">
              <SchedulePage />
            </PermissionRoute>
          }
        />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="collaborators" element={<CollaboratorsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route
          path="history"
          element={
            <PermissionRoute module="history">
              <HistoryPage />
            </PermissionRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
