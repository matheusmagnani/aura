import { useAuthStore } from '../../../shared/stores/useAuthStore'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-app-gray">
        Bem-vindo, <span className="text-white">{user?.name}</span>!
      </p>
    </div>
  )
}
