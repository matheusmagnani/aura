import { api } from './api'

export interface ClientStatus {
  id: number
  name: string
  color: string
  companyId: number
  createdAt: string
  updatedAt: string
}

export const clientStatusService = {
  async list(): Promise<ClientStatus[]> {
    const response = await api.get('/client-statuses')
    return response.data
  },

  async create(data: { name: string; color: string }): Promise<ClientStatus> {
    const response = await api.post('/client-statuses', data)
    return response.data
  },

  async update(id: number, data: { name?: string; color?: string }): Promise<ClientStatus> {
    const response = await api.put(`/client-statuses/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/client-statuses/${id}`)
  },
}
