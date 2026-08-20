import { Outlet } from 'react-router-dom'
import { Sidebar, MobileNav } from './Sidebar'
import { Header } from './Header'
import { DemoBanner } from './DemoBanner'
import { useServerWarmup } from '../hooks/useServerWarmup'

export function Layout() {
  useServerWarmup()

  return (
    // A faixa de demonstração fica acima de tudo (inclusive da sidebar) e é a
    // primeira coisa que se vê. Só renderiza em conta demo — nas demais o
    // componente devolve null e o layout fica idêntico ao de antes.
    <div className="flex flex-col overflow-hidden bg-app-bg" style={{ height: '100dvh' }}>
      <DemoBanner />
      <div className="flex flex-1 min-h-0 overflow-hidden">
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
    </div>
  )
}
