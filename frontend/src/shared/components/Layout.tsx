import { Outlet } from 'react-router-dom'
import { Sidebar, MobileNav } from './Sidebar'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
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
