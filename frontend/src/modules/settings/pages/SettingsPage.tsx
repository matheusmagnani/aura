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

  return (
    <div>
      <PageHeader title="Configurações" icon={Gear} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
        <CompanyInfoSection
          isExpanded={expanded === 'company'}
          onToggle={() => toggle('company')}
        />
        <RolesSection
          isExpanded={expanded === 'roles'}
          onToggle={() => toggle('roles')}
        />
        <PermissionsSection
          isExpanded={expanded === 'permissions'}
          onToggle={() => toggle('permissions')}
        />
        <ClientStatusSection
          isExpanded={expanded === 'clientStatuses'}
          onToggle={() => toggle('clientStatuses')}
        />
      </div>
    </div>
  )
}
