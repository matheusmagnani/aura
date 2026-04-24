import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/useAuthStore'
import { permissionService, type Permission } from '../services/permissionService'

export const PATH_TO_MODULE: Record<string, string> = {
  '/schedule': 'schedule',
  '/clients': 'clients',
  '/collaborators': 'collaborators',
  '/settings': 'settings',
  '/history': 'history',
  '/proposals': 'proposals',
}

export function useMyPermissions() {
  const user = useAuthStore((s) => s.user)
  const roleId = user?.roleId ?? null

  const { data: permissions = [], isLoading } = useQuery<Permission[]>({
    queryKey: ['my-permissions', roleId],
    queryFn: () => permissionService.getByRoleId(roleId!),
    enabled: roleId !== null,
    staleTime: 1000 * 60 * 5,
  })

  return {
    permissions,
    isLoading,
    isAdmin: roleId === null,
  }
}

export function useCanAccess(module: string, action: string): boolean {
  const { permissions, isAdmin } = useMyPermissions()

  if (isAdmin) return true

  const perm = permissions.find(
    (p) => p.module === module && p.action === action,
  )
  return perm?.allowed ?? false
}
