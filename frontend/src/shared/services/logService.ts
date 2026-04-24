import { api } from './api'

export interface Log {
  id: number
  companyId: number
  userId: number | null
  userName: string
  module: string
  action: string
  entityId: number | null
  entityName: string | null
  description: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface LogsResponse {
  data: Log[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface ListLogsParams {
  page?: number
  limit?: number
  modules?: string[]
  actions?: string[]
  userIds?: number[]
  entityId?: number
  entityModule?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}

export const logService = {
  async list(params: ListLogsParams): Promise<LogsResponse> {
    const { modules, actions, userIds, ...rest } = params
    const response = await api.get('/logs', {
      params: {
        ...rest,
        ...(modules && modules.length > 0 && { modules: modules.join(',') }),
        ...(actions && actions.length > 0 && { actions: actions.join(',') }),
        ...(userIds && userIds.length > 0 && { userIds: userIds.join(',') }),
      },
    })
    return response.data
  },

  async listByEntity(entityId: number, page = 1, entityModule?: string): Promise<LogsResponse> {
    return logService.list({ entityId, entityModule, page, limit: 30 })
  },
}
