import { useState, useEffect, useCallback, useMemo } from 'react'
import { ShieldCheck, CaretDown } from '@phosphor-icons/react'
import { Checkbox } from '../../../shared/components/ui/Checkbox'
import { Select } from '../../../shared/components/ui/Select'
import { SettingsSection } from './SettingsSection'
import { useRoles } from '../hooks/useRoles'
import { usePermissions, useUpdatePermissions } from '../hooks/usePermissions'
import { useToast } from '../../../shared/hooks/useToast'

const MODULES = ['schedule', 'clients', 'collaborators', 'settings', 'history'] as const
const ACTIONS = ['read', 'create', 'edit', 'delete'] as const

const MODULE_LABELS: Record<string, string> = {
  schedule: 'Agenda',
  clients: 'Clientes',
  collaborators: 'Colaboradores',
  settings: 'Configurações',
  history: 'Histórico',
}

const ACTION_LABELS: Record<string, string> = {
  read: 'Leitura',
  create: 'Criação',
  edit: 'Edição',
  delete: 'Exclusão',
}

type PermissionMap = Record<string, Record<string, boolean>>

function buildPermissionMap(permissions: { module: string; action: string; allowed: boolean }[]): PermissionMap {
  const map: PermissionMap = {}
  for (const mod of MODULES) {
    map[mod] = {}
    for (const act of ACTIONS) map[mod][act] = false
  }
  for (const p of permissions) {
    if (map[p.module]) map[p.module][p.action] = p.allowed
  }
  return map
}

export function PermissionsSection({ isExpanded: isExpandedProp, onToggle: onToggleProp }: { isExpanded?: boolean; onToggle?: () => void } = {}) {
  const [isExpandedInternal, setIsExpandedInternal] = useState(false)
  const isExpanded = isExpandedProp !== undefined ? isExpandedProp : isExpandedInternal
  const handleSectionToggle = onToggleProp ?? (() => setIsExpandedInternal(v => !v))
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [localPermissions, setLocalPermissions] = useState<PermissionMap>(() => buildPermissionMap([]))
  const [hasChanges, setHasChanges] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  const { data: rolesData } = useRoles()
  const { data: permissions, isLoading: isLoadingPermissions } = usePermissions(selectedRoleId)
  const updatePermissions = useUpdatePermissions()
  const { addToast } = useToast()

  const activeRoles = (rolesData?.data ?? []).filter((r) => r.status === 1)

  useEffect(() => {
    if (permissions) {
      setLocalPermissions(buildPermissionMap(permissions))
      setHasChanges(false)
    }
  }, [permissions])

  useEffect(() => {
    if (!selectedRoleId && activeRoles.length > 0) {
      setSelectedRoleId(activeRoles[0].id)
    }
  }, [activeRoles, selectedRoleId])

  const handleToggle = useCallback((module: string, action: string) => {
    setLocalPermissions((prev) => ({
      ...prev,
      [module]: { ...prev[module], [action]: !prev[module][action] },
    }))
    setHasChanges(true)
  }, [])

  const handleToggleModule = useCallback((module: string) => {
    setLocalPermissions((prev) => {
      const allChecked = ACTIONS.every((act) => prev[module]?.[act])
      const updated = {} as Record<string, boolean>
      for (const act of ACTIONS) updated[act] = !allChecked
      return { ...prev, [module]: updated }
    })
    setHasChanges(true)
  }, [])

  const handleToggleAll = useCallback(() => {
    setLocalPermissions((prev) => {
      const allChecked = MODULES.every((mod) => ACTIONS.every((act) => prev[mod]?.[act]))
      const newMap: PermissionMap = {}
      for (const mod of MODULES) {
        newMap[mod] = {}
        for (const act of ACTIONS) newMap[mod][act] = !allChecked
      }
      return newMap
    })
    setHasChanges(true)
  }, [])

  const isModuleAllChecked = useCallback(
    (module: string) => ACTIONS.every((act) => localPermissions[module]?.[act]),
    [localPermissions]
  )

  const isModuleSomeChecked = useCallback(
    (module: string) =>
      ACTIONS.some((act) => localPermissions[module]?.[act]) &&
      !ACTIONS.every((act) => localPermissions[module]?.[act]),
    [localPermissions]
  )

  const isAllChecked = useMemo(
    () => MODULES.every((mod) => ACTIONS.every((act) => localPermissions[mod]?.[act])),
    [localPermissions]
  )

  const isSomeChecked = useMemo(
    () => MODULES.some((mod) => ACTIONS.some((act) => localPermissions[mod]?.[act])) && !isAllChecked,
    [localPermissions, isAllChecked]
  )

  const handleSave = async () => {
    if (!selectedRoleId) return
    const permissionsArray = MODULES.flatMap((mod) =>
      ACTIONS.map((act) => ({ module: mod, action: act, allowed: localPermissions[mod]?.[act] ?? false }))
    )
    try {
      await updatePermissions.mutateAsync({ roleId: selectedRoleId, permissions: permissionsArray })
      addToast('Permissões atualizadas com sucesso!', 'success')
      setHasChanges(false)
    } catch {
      addToast('Erro ao atualizar permissões', 'danger')
    }
  }

  const toggleModuleExpanded = (module: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(module)) next.delete(module)
      else next.add(module)
      return next
    })
  }

  return (
    <SettingsSection
      title="Permissões"
      description="Defina as permissões de cada setor"
      icon={<ShieldCheck size={20} weight="fill" />}
      isExpanded={isExpanded}
      onToggle={handleSectionToggle}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 8 }}>
        {/* Role tabs */}
        {activeRoles.length === 0 ? (
          <p style={{ fontSize: 14, color: 'rgba(106,166,193,0.4)' }}>Nenhum setor ativo</p>
        ) : (
          <>
            {/* Mobile: select */}
            <Select
              className="md:hidden"
              variant="accent"
              value={String(selectedRoleId ?? '')}
              onChange={(v) => { setSelectedRoleId(Number(v)); setHasChanges(false) }}
              options={activeRoles.map(r => ({ value: String(r.id), label: r.name }))}
            />

            {/* Desktop: buttons */}
            <div className="hidden md:flex" style={{ gap: 8, flexWrap: 'wrap' }}>
              {activeRoles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => { setSelectedRoleId(role.id); setHasChanges(false) }}
                  style={{
                    flex: 1, minWidth: 0, padding: '8px 12px', borderRadius: 12, border: 'none',
                    cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
                    background: selectedRoleId === role.id ? 'var(--color-app-accent)' : 'rgba(255,255,255,0.03)',
                    color: selectedRoleId === role.id ? 'var(--color-app-primary)' : 'rgba(106,166,193,0.6)',
                    ...(selectedRoleId !== role.id && { border: '1px solid rgba(106,166,193,0.2)' }),
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}
                >
                  {role.name}
                </button>
              ))}
            </div>
          </>
        )}

        {selectedRoleId && (
          isLoadingPermissions ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <div style={{ width: 24, height: 24, border: '2px solid rgba(106,166,193,0.3)', borderTopColor: 'var(--color-app-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <>
              {/* Select all */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 16,
                borderRadius: 12, background: 'rgba(106,166,193,0.05)',
                border: '1px solid rgba(106,166,193,0.3)',
              }}>
                <Checkbox
                  size="sm"
                  checked={isAllChecked}
                  data-indeterminate={isSomeChecked || undefined}
                  onCheckedChange={handleToggleAll}
                />
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-app-accent)' }}>
                  Ativar todas as permissões
                </span>
              </div>

              {/* Module cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MODULES.map((module) => {
                  const isOpen = expandedModules.has(module)
                  return (
                    <div
                      key={module}
                      style={{
                        borderRadius: 12, overflow: 'hidden',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(230,194,132,0.1)',
                      }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleModuleExpanded(module)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleModuleExpanded(module) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 16, width: '100%',
                          padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                        }}
                      >
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            size="sm"
                            checked={isModuleAllChecked(module)}
                            data-indeterminate={isModuleSomeChecked(module) || undefined}
                            onCheckedChange={() => handleToggleModule(module)}
                          />
                        </div>
                        <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 500, color: 'var(--color-app-accent)' }}>
                          {MODULE_LABELS[module]}
                        </span>
                        <CaretDown
                          size={16}
                          weight="bold"
                          style={{
                            color: 'rgba(230,194,132,0.4)',
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                          }}
                        />
                      </div>

                      {isOpen && (
                        <div className="permissions-actions" style={{ padding: '8px 16px 12px', paddingLeft: 32 }}>
                          {ACTIONS.map((action) => (
                            <label
                              key={action}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                            >
                              <Checkbox
                                size="sm"
                                checked={localPermissions[module]?.[action] ?? false}
                                onCheckedChange={() => handleToggle(module, action)}
                              />
                              <span style={{ fontSize: 13, color: 'rgba(230,194,132,0.6)' }}>
                                {ACTION_LABELS[action]}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Save button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || updatePermissions.isPending}
                  style={{
                    padding: '8px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: 'rgba(106,166,193,0.15)', color: 'var(--color-app-accent)',
                    fontSize: 14, fontWeight: 500, opacity: (!hasChanges || updatePermissions.isPending) ? 0.4 : 1,
                  }}
                >
                  {updatePermissions.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </>
          )
        )}
      </div>
    </SettingsSection>
  )
}
