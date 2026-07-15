import { api } from './api'

export interface Role {
  id: number
  name: string
  idStatus: number
  companyId: number
  _count?: { users: number }
}

export interface RolesResponse {
  data: Role[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface RoleSelectItem {
  id: number
  name: string
}

export const roleService = {
  async select(): Promise<RoleSelectItem[]> {
    const response = await api.get('/roles/select')
    return response.data
  },

  async list(params?: { page?: number; limit?: number; search?: string; status?: number }): Promise<RolesResponse> {
    const response = await api.get('/roles', { params })
    return response.data
  },

  async create(data: { name: string; idStatus?: number }): Promise<Role> {
    const response = await api.post<Role>('/roles', data, { meta: { blockingLoader: true } })
    return response.data
  },

  async update(id: number, data: { name?: string; idStatus?: number }): Promise<Role> {
    const response = await api.put<Role>(`/roles/${id}`, data, { meta: { blockingLoader: true } })
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/roles/${id}`)
  },
}
