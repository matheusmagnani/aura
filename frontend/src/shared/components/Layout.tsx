import { Outlet } from 'react-router-dom'
import { Sidebar, MobileNav } from './Sidebar'
import { Header } from './Header'
import { useServerWarmup } from '../hooks/useServerWarmup'

export function Layout() {
  useServerWarmup()

  return (
    <div className="flex overflow-hidden bg-app-bg" style={{ height: '100dvh' }}>
      <Sidebar />
      <div
        className="flex-1 min-w-0 flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(to bottom, #1D4060 0%, #1D2529 25%, #171514 55%)', backgroundAttachment: 'fixed' }}
      >
        <Header />
        <MobileNav />
        <main className="flex-1 overflow-y-auto page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
