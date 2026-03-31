import { api } from './api'

export interface Permission {
  id: number
  roleId: number
  module: string
  action: string
  allowed: boolean
}

export const permissionService = {
  async getByRoleId(roleId: number): Promise<Permission[]> {
    const response = await api.get<Permission[]>(`/permissions/${roleId}`)
    return response.data
  },

  async updateByRoleId(
    roleId: number,
    permissions: { module: string; action: string; allowed: boolean }[],
  ): Promise<Permission[]> {
    const response = await api.put<Permission[]>(
      `/permissions/${roleId}`,
      permissions,
    )
    return response.data
  },
}
