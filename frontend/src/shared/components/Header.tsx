import { SignOut } from '@phosphor-icons/react'
import { useAuthStore } from '../stores/useAuthStore'
import { useNavigate } from 'react-router-dom'

export function Header() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return (
    <header className="h-16 bg-app-primary border-b border-white/5 flex items-center justify-between px-6">
      <div />

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-app-secondary/20 flex items-center justify-center text-app-secondary text-xs font-semibold">
            {initials}
          </div>
          <span className="text-sm text-white">{user?.name}</span>
        </div>

        <button
          onClick={handleLogout}
          className="text-app-gray hover:text-white transition-colors"
          title="Sair"
        >
          <SignOut size={20} />
        </button>
      </div>
    </header>
  )
}
