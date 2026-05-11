import { useRef } from 'react'
import { Gear } from '@phosphor-icons/react'
import { PageHeader } from '../../../shared/components/PageHeader'
import { CompanyInfoSection } from '../components/CompanyInfoSection'
import { RolesSection } from '../components/RolesSection'
import { PermissionsSection } from '../components/PermissionsSection'
import { ClientStatusSection } from '../components/ClientStatusSection'
import { useExpandedSection } from '../hooks/useExpandedSection'

type Section = 'company' | 'roles' | 'permissions' | 'clientStatuses'

export function SettingsPage() {
  const { expanded, toggle } = useExpandedSection<Section>()

  const refs: Record<Section, React.RefObject<HTMLDivElement>> = {
    company: useRef<HTMLDivElement>(null),
    roles: useRef<HTMLDivElement>(null),
    permissions: useRef<HTMLDivElement>(null),
    clientStatuses: useRef<HTMLDivElement>(null),
  }

  function handleToggle(section: Section) {
    const isOpening = expanded !== section
    toggle(section)
    if (isOpening) {
      setTimeout(() => {
        const el = refs[section].current
        if (!el) return
        const pageHeader = document.querySelector('.page-header')
        const offset = pageHeader ? pageHeader.getBoundingClientRect().height + 8 : 80
        const main = el.closest('main') ?? window
        const top = el.getBoundingClientRect().top - (main instanceof Element ? main.getBoundingClientRect().top : 0) + (main instanceof Element ? main.scrollTop : window.scrollY) - offset
        if (main instanceof Element) {
          main.scrollTo({ top, behavior: 'smooth' })
        } else {
          window.scrollTo({ top, behavior: 'smooth' })
        }
      }, 50)
    }
  }

  return (
    <div>
      <PageHeader title="Configurações" icon={Gear} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
        <div ref={refs.company}>
          <CompanyInfoSection
            isExpanded={expanded === 'company'}
            onToggle={() => handleToggle('company')}
          />
        </div>
        <div ref={refs.roles}>
          <RolesSection
            isExpanded={expanded === 'roles'}
            onToggle={() => handleToggle('roles')}
          />
        </div>
        <div ref={refs.permissions}>
          <PermissionsSection
            isExpanded={expanded === 'permissions'}
            onToggle={() => handleToggle('permissions')}
          />
        </div>
        <div ref={refs.clientStatuses}>
          <ClientStatusSection
            isExpanded={expanded === 'clientStatuses'}
            onToggle={() => handleToggle('clientStatuses')}
          />
        </div>
      </div>
    </div>
  )
}
