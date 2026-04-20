import { api } from './api'

export interface Collaborator {
  id: number
  name: string
  email: string
  avatar: string | null
  active: boolean
  companyId: number
  roleId: number | null
  role: { id: number; name: string } | null
  createdAt: string
  updatedAt: string
}

export interface CollaboratorsResponse {
  data: Collaborator[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface CollaboratorPayload {
  name: string
  email: string
  password: string
  roleId?: number
}

export interface UpdateCollaboratorPayload {
  name?: string
  email?: string
  roleId?: number | null
  active?: boolean
}

export const collaboratorsService = {
  async list(params: {
    page?: number
    limit?: number
    search?: string
    active?: number
    roleIds?: number[]
  }): Promise<CollaboratorsResponse> {
    const { roleIds, ...rest } = params
    const response = await api.get('/collaborators', {
      params: { ...rest, ...(roleIds && roleIds.length > 0 && { roleIds: roleIds.join(',') }) },
    })
    return response.data
  },

  async create(data: CollaboratorPayload): Promise<Collaborator> {
    const response = await api.post('/collaborators', data)
    return response.data
  },

  async update(id: number, data: UpdateCollaboratorPayload): Promise<Collaborator> {
    const response = await api.put(`/collaborators/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/collaborators/${id}`)
  },

  async resetPassword(id: number, newPassword: string): Promise<void> {
    await api.put(`/collaborators/${id}/password`, { newPassword })
  },
}
