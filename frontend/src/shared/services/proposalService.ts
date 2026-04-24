import { api } from './api'

export interface Proposal {
  id: number
  value: number
  description: string | null
  clientObservation: string | null
  status: 'pending' | 'sent' | 'accepted' | 'refused'
  statusChangedAt: string | null
  companyId: number
  clientId: number
  client: { id: number; name: string }
  collaboratorId: number | null
  collaborator: { id: number; name: string; avatar: string | null } | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ProposalsResponse {
  data: Proposal[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface ProposalPayload {
  value: number
  description?: string | null
  clientObservation?: string | null
  status?: 'pending' | 'sent' | 'accepted' | 'refused'
  clientId?: number
  collaboratorId?: number | null
}

export const proposalService = {
  async list(params: {
    page?: number
    limit?: number
    search?: string
    clientId?: number
    collaboratorId?: number
    status?: string
  }): Promise<ProposalsResponse> {
    const response = await api.get('/proposals', { params })
    return response.data
  },

  async getById(id: number): Promise<Proposal> {
    const response = await api.get(`/proposals/${id}`)
    return response.data
  },

  async create(data: ProposalPayload): Promise<Proposal> {
    const response = await api.post('/proposals', data)
    return response.data
  },

  async update(id: number, data: Partial<ProposalPayload>): Promise<Proposal> {
    const response = await api.put(`/proposals/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/proposals/${id}`)
  },
}
