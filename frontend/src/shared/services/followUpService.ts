import { api } from './api'

export interface FollowUp {
  id: number
  content: string
  userId: number | null
  userName: string
  userColor: string | null
  createdAt: string
}

export interface FollowUpsResponse {
  data: FollowUp[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export const followUpService = {
  async list(clientId: number, page = 1, limit = 50): Promise<FollowUpsResponse> {
    const response = await api.get('/follow-ups', { params: { clientId, page, limit } })
    return response.data
  },

  async create(content: string, clientId: number): Promise<FollowUp> {
    const response = await api.post('/follow-ups', { content, clientId })
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/follow-ups/${id}`)
  },
}
