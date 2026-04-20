import { api } from './api'

export interface Client {
  id: number
  name: string
  email: string | null
  phone: string
  document: string | null
  documentType: string | null
  address: string | null
  addressNumber: string | null
  addressComplement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  companyId: number
  userId: number | null
  user: { id: number; name: string; avatar: string | null } | null
  statusId: number | null
  clientStatus: { id: number; name: string; color: string } | null
  createdAt: string
  updatedAt: string
}

export interface ClientsResponse {
  data: Client[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface ClientPayload {
  name: string
  email?: string | null
  phone: string
  document?: string | null
  documentType?: string | null
  address?: string | null
  addressNumber?: string | null
  addressComplement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  statusId?: number | null
  userId?: number | null
}

export const clientService = {
  async list(params: { page?: number; limit?: number; search?: string; searchFields?: 'nameOrDocument'; statusIds?: number[]; userIds?: number[]; dateFrom?: string; dateTo?: string }): Promise<ClientsResponse> {
    const { statusIds, userIds, ...rest } = params
    const response = await api.get('/clients', {
      params: {
        ...rest,
        ...(statusIds && statusIds.length > 0 && { statusIds: statusIds.join(',') }),
        ...(userIds && userIds.length > 0 && { userIds: userIds.join(',') }),
      },
    })
    return response.data
  },

  async getById(id: number): Promise<Client> {
    const response = await api.get(`/clients/${id}`)
    return response.data
  },

  async create(data: ClientPayload): Promise<Client> {
    const response = await api.post('/clients', data)
    return response.data
  },

  async update(id: number, data: Partial<ClientPayload>): Promise<Client> {
    const response = await api.put(`/clients/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/clients/${id}`)
  },
}
