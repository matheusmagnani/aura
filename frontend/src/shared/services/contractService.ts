import { api } from './api'

export interface Contract {
  id: number
  name: string
  content: Record<string, unknown>
  pdfUrl: string
  templateId: number
  clientId: number
  proposalId: number
  companyId: number
  createdAt: string
  updatedAt: string
  template?: { name: string }
  proposal?: { value: number }
}

export interface ContractsPaginatedResponse {
  data: Contract[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export const contractService = {
  async listByClient(clientId: number): Promise<Contract[]> {
    const res = await api.get('/contracts', { params: { clientId } })
    return res.data
  },

  async listByClientPaginated(clientId: number, page: number, limit: number): Promise<ContractsPaginatedResponse> {
    const res = await api.get('/contracts', { params: { clientId, page, limit } })
    return res.data
  },

  async getById(id: number): Promise<Contract> {
    const res = await api.get(`/contracts/${id}`)
    return res.data
  },

  async create(data: { templateId: number; clientId: number; proposalId: number }): Promise<Contract> {
    const res = await api.post('/contracts', data)
    return res.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/contracts/${id}`)
  },

  async downloadBlob(id: number): Promise<Blob> {
    const res = await api.get(`/contracts/${id}/download`, { responseType: 'blob' })
    return res.data
  },
}
