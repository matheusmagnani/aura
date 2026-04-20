import { api } from './api'

export interface Appointment {
  id: number
  title: string
  description: string | null
  startAt: string
  companyId: number
  clientId: number | null
  client: { id: number; name: string } | null
  collaboratorId: number | null
  collaborator: { id: number; name: string; avatar: string | null } | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AppointmentPayload {
  title: string
  description?: string | null
  startAt: string
  clientId?: number | null
  collaboratorId?: number | null
}

export const scheduleService = {
  async list(params: {
    dateFrom?: string
    dateTo?: string
    clientId?: number
    collaboratorId?: number
  }): Promise<Appointment[]> {
    const response = await api.get('/schedule', { params })
    return response.data
  },

  async getById(id: number): Promise<Appointment> {
    const response = await api.get(`/schedule/${id}`)
    return response.data
  },

  async create(data: AppointmentPayload): Promise<Appointment> {
    const response = await api.post('/schedule', data)
    return response.data
  },

  async update(id: number, data: Partial<AppointmentPayload>): Promise<Appointment> {
    const response = await api.put(`/schedule/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/schedule/${id}`)
  },
}
