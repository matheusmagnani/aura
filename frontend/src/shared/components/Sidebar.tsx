import { NavLink } from 'react-router-dom'
import { House, CalendarBlank, Users, Gear } from '@phosphor-icons/react'

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: House },
  { path: '/schedule', label: 'Agenda', icon: CalendarBlank },
  { path: '/clients', label: 'Clientes', icon: Users },
  { path: '/settings', label: 'Configurações', icon: Gear },
]

export function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-app-primary flex flex-col fixed left-0 top-0">
      <div className="flex items-center gap-2 px-6 py-6">
        <span className="text-2xl font-bold text-app-secondary">Aura</span>
      </div>

      <nav className="flex-1 px-3 py-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-app-secondary/10 text-app-secondary'
                  : 'text-app-gray hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
