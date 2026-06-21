import { api } from './api'

export interface Proposal {
  id: number
  value: number
  description: string | null
  clientObservation: string | null
  idStatus: number
  statusChangedAt: string | null
  companyId: number
  clientId: number
  client: { id: number; name: string }
  collaboratorId: number | null
  collaborator: { id: number; name: string; avatar: string | null; color: string | null } | null
  deadlineDays: number | null
  deadlineType: string | null
  signalValue: number | null
  signalPaymentMethod: string | null
  remainingPaymentMethod: string | null
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
  idStatus?: number
  clientId?: number
  collaboratorId?: number | null
  deadlineDays?: number | null
  deadlineType?: string | null
  signalValue?: number | null
  signalPaymentMethod?: string | null
  remainingPaymentMethod?: string | null
}

export interface ProposalStatusStat {
  idStatus: number
  count: number
  totalValue: number
}

export const proposalService = {
  async list(params: {
    page?: number
    limit?: number
    search?: string
    clientId?: number
    collaboratorId?: number
    idStatus?: number
    statuses?: number[]
    dateFrom?: string
    dateTo?: string
    statusChangedFrom?: string
    statusChangedTo?: string
  }): Promise<ProposalsResponse> {
    const { statuses, ...rest } = params
    const response = await api.get('/proposals', {
      params: {
        ...rest,
        ...(statuses && statuses.length > 0 && { statuses: statuses.join(',') }),
      },
    })
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

  async stats(params?: { collaboratorId?: number; clientId?: number; dateFrom?: string; dateTo?: string; statusChangedFrom?: string; statusChangedTo?: string }): Promise<ProposalStatusStat[]> {
    const response = await api.get('/proposals/stats', { params })
    return response.data
  },
}
