import { api } from './api'
import type { Appointment, AppointmentPayload } from './scheduleService'
import type { Client, ClientPayload, ClientsResponse, ClientStatusStat } from './clientService'
import type { Proposal, ProposalPayload, ProposalsResponse, ProposalStatusStat } from './proposalService'
import type { ClientStatus } from './clientStatusService'
import type { CollaboratorSelectItem } from './collaboratorsService'
import type { LogsResponse } from './logService'

export const dashboardService = {
  // ── Lookups ──────────────────────────────────────────────────────────────────

  async clientLogs(entityId: number, page = 1): Promise<LogsResponse> {
    const response = await api.get(`/dashboard/client-logs/${entityId}`, { params: { page, limit: 30 } })
    return response.data
  },

  async clientStatuses(): Promise<ClientStatus[]> {
    const response = await api.get('/dashboard/client-statuses')
    return response.data
  },

  async collaboratorsSelect(): Promise<CollaboratorSelectItem[]> {
    const response = await api.get('/dashboard/collaborators')
    return response.data
  },

  // ── Appointments ────────────────────────────────────────────────────────────

  async getClientById(id: number): Promise<Client> {
    const response = await api.get(`/dashboard/clients/${id}`)
    return response.data
  },

  async appointments(params: {
    dateFrom?: string
    dateTo?: string
    collaboratorId?: number
    clientId?: number
  }): Promise<Appointment[]> {
    const response = await api.get('/dashboard/appointments', { params })
    return response.data
  },

  async createAppointment(data: AppointmentPayload): Promise<Appointment> {
    const response = await api.post('/dashboard/appointments', data)
    return response.data
  },

  async updateAppointment(id: number, data: Partial<AppointmentPayload>): Promise<Appointment> {
    const response = await api.put(`/dashboard/appointments/${id}`, data)
    return response.data
  },

  async deleteAppointment(id: number): Promise<void> {
    await api.delete(`/dashboard/appointments/${id}`)
  },

  // ── Clients ─────────────────────────────────────────────────────────────────

  async clients(params: {
    page?: number
    limit?: number
    search?: string
    statusIds?: number[]
    dateFrom?: string
    dateTo?: string
    appointmentDateFrom?: string
    appointmentDateTo?: string
  }): Promise<ClientsResponse> {
    const { statusIds, ...rest } = params
    const response = await api.get('/dashboard/clients', {
      params: {
        ...rest,
        ...(statusIds && statusIds.length > 0 && { statusIds: statusIds.join(',') }),
      },
    })
    return response.data
  },

  async clientStats(params?: {
    search?: string
    dateFrom?: string
    dateTo?: string
    appointmentDateFrom?: string
    appointmentDateTo?: string
  }): Promise<ClientStatusStat[]> {
    const response = await api.get('/dashboard/client-stats', { params })
    return response.data
  },

  async createClient(data: ClientPayload): Promise<Client> {
    const response = await api.post('/dashboard/clients', data)
    return response.data
  },

  async updateClient(id: number, data: Partial<ClientPayload>): Promise<Client> {
    const response = await api.put(`/dashboard/clients/${id}`, data)
    return response.data
  },

  async deleteClient(id: number): Promise<void> {
    await api.delete(`/dashboard/clients/${id}`)
  },

  // ── Proposals ───────────────────────────────────────────────────────────────

  async proposals(params: {
    page?: number
    limit?: number
    search?: string
    clientId?: number
    collaboratorId?: number
    statuses?: string[]
    dateFrom?: string
    dateTo?: string
    statusChangedFrom?: string
    statusChangedTo?: string
  }): Promise<ProposalsResponse> {
    const { statuses, ...rest } = params
    const response = await api.get('/dashboard/proposals', {
      params: {
        ...rest,
        ...(statuses && statuses.length > 0 && { statuses: statuses.join(',') }),
      },
    })
    return response.data
  },

  async proposalStats(params?: {
    dateFrom?: string
    dateTo?: string
    statusChangedFrom?: string
    statusChangedTo?: string
  }): Promise<ProposalStatusStat[]> {
    const response = await api.get('/dashboard/proposal-stats', { params })
    return response.data
  },

  async createProposal(data: ProposalPayload): Promise<Proposal> {
    const response = await api.post('/dashboard/proposals', data)
    return response.data
  },

  async updateProposal(id: number, data: Partial<Omit<ProposalPayload, 'clientId'>>): Promise<Proposal> {
    const response = await api.put(`/dashboard/proposals/${id}`, data)
    return response.data
  },

  async deleteProposal(id: number): Promise<void> {
    await api.delete(`/dashboard/proposals/${id}`)
  },
}
