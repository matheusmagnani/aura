import { Coffee, SunHorizon, MoonStars } from '@phosphor-icons/react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuthStore } from '../stores/useAuthStore'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return { Icon: Coffee }
  if (hour < 18) return { Icon: SunHorizon }
  return { Icon: MoonStars }
}

export function GreetingHero() {
  const user = useAuthStore(s => s.user)
  const { Icon } = getGreeting()
  const firstName = user?.name?.split(' ')[0] ?? ''

  const dateLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR }).toUpperCase()

  return (
    <div className="relative overflow-hidden">
      <div style={{ padding: '12px 8px' }} className="relative md:hidden">
        <div className="mb-1.5 flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-app-gray">
          <Icon size={14} className="text-app-secondary" weight="light" />
          {dateLabel}
        </div>
        <h1 className="m-0 text-[26px] font-bold leading-[1.15] tracking-[-0.01em] text-white">
          Olá, <span className="text-app-secondary">{firstName}</span>.
        </h1>
      </div>
      <div style={{ padding: '24px 8px' }} className="relative hidden md:block">
        <div className="mb-1.5 flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-app-gray">
          <Icon size={14} className="text-app-secondary" weight="light" />
          {dateLabel}
        </div>
        <h1 className="m-0 text-[30px] font-bold leading-[1.15] tracking-[-0.01em] text-white">
          Olá, <span className="text-app-secondary">{firstName}</span>.
        </h1>
      </div>
    </div>
  )
}
