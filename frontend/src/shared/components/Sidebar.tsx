import { useState, useEffect } from 'react'
import { ChartPieSlice, CalendarBlank, Users, UsersThree, Gear, ClockCounterClockwise, AlignLeft, AlignTopSimple, type Icon, type IconWeight } from '@phosphor-icons/react'
import { Link, useLocation } from 'react-router-dom'
import logoImg from '../../assets/logo.png'
import { useMyPermissions, PATH_TO_MODULE } from '../hooks/useMyPermissions'

interface MenuItem {
  label: string
  icon: Icon
  path: string
}

const menuItems: MenuItem[] = [
  { label: 'Dashboard', icon: ChartPieSlice, path: '/dashboard' },
  { label: 'Clientes', icon: UsersThree, path: '/clients' },
  { label: 'Agenda', icon: CalendarBlank, path: '/schedule' },
  { label: 'Colaboradores', icon: Users, path: '/collaborators' },
  { label: 'Histórico', icon: ClockCounterClockwise, path: '/history' },
  { label: 'Configurações', icon: Gear, path: '/settings' },
]

const COLLAPSE_BREAKPOINT = 1280

function useVisibleMenuItems() {
  const { permissions, isAdmin } = useMyPermissions()
  return menuItems.filter((item) => {
    const module = PATH_TO_MODULE[item.path]
    if (!module) return true
    if (isAdmin) return true
    const perm = permissions.find((p) => p.module === module && p.action === 'read')
    return perm?.allowed ?? false
  })
}

export function Sidebar() {
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < COLLAPSE_BREAKPOINT)
  const visibleMenuItems = useVisibleMenuItems()

  useEffect(() => {
    const handleResize = () => setIsCollapsed(window.innerWidth < COLLAPSE_BREAKPOINT)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div
      className={`desktop-sidebar h-screen bg-app-primary overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] relative flex-shrink-0 ${isCollapsed ? 'w-[68px]' : 'w-[260px]'}`}
    >
      {/* Toggle */}
      <button
        onClick={() => setIsCollapsed((prev) => !prev)}
        className={`
          absolute top-4 p-2 hover:bg-white/10 rounded z-10
          transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${isCollapsed ? 'right-1/2 translate-x-1/2' : 'right-2'}
        `}
      >
        <div className="relative w-6 h-6">
          <AlignLeft
            className={`absolute inset-0 w-6 h-6 text-app-secondary transition-all duration-300 ${isCollapsed ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90'}`}
            weight="regular"
          />
          <AlignTopSimple
            className={`absolute inset-0 w-6 h-6 text-app-secondary transition-all duration-300 ${isCollapsed ? 'opacity-0 rotate-90' : 'opacity-100 rotate-0'}`}
            weight="regular"
          />
        </div>
      </button>

      {/* Logo */}
      <div className="h-[250px] flex-shrink-0 flex items-center justify-center">
        <div
          className={`transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}
        >
          <img src={logoImg} alt="Aura" className="w-[120px] h-auto" />
        </div>
      </div>

      {/* Menu */}
      <div className="flex-1 flex flex-col gap-[10px] items-center">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                relative flex items-center rounded-[10px] h-[48px] overflow-hidden
                transition-[width,background-color,border-color] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                pr-[14px]
                ${isActive ? 'bg-app-bg border border-app-secondary/60' : 'hover:bg-white/5 border border-transparent'}
                ${isCollapsed ? 'md:w-[50px]' : 'md:w-[242px]'}
                w-[242px]
              `}
              title={isCollapsed ? item.label : ''}
            >
              <Icon
                className="text-app-secondary flex-shrink-0 w-[26px] h-[26px]"
                weight={(isActive ? 'regular' : 'light') as IconWeight}
                style={{ marginLeft: '11px' }}
              />
              <span
                className={`
                  absolute top-0 bottom-0 left-0 w-[242px] flex items-center justify-center
                  text-base leading-[1.11] text-app-secondary whitespace-nowrap pointer-events-none
                  ${isActive ? 'font-normal' : 'font-light'}
                `}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 pb-4 flex justify-center">
        <span
          className={`text-xs text-app-secondary/50 font-light transition-all duration-500 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}
        >
          v1.0.0
        </span>
      </div>
    </div>
  )
}

export function MobileNav() {
  const location = useLocation()
  const visibleMenuItems = useVisibleMenuItems()

  return (
    <div className="mobile-nav" style={{ marginTop: '0.75rem' }}>
      {visibleMenuItems.map((item) => {
        const Icon = item.icon
        const isActive = location.pathname === item.path

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center justify-center w-11 h-11 rounded-xl transition-colors ${
              isActive ? 'bg-app-primary' : ''
            }`}
            title={item.label}
          >
            <Icon
              className={`w-6 h-6 ${isActive ? 'text-app-secondary' : 'text-white'}`}
              weight={(isActive ? 'regular' : 'light') as IconWeight}
            />
          </Link>
        )
      })}
    </div>
  )
}
