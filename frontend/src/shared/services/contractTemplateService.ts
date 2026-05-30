import { api } from './api'

export interface ContractTemplate {
  id: number
  name: string
  content: Record<string, unknown>
  companyId: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export const contractTemplateService = {
  async list(): Promise<ContractTemplate[]> {
    const res = await api.get('/contract-templates')
    return res.data
  },

  async create(data: { name: string; content: Record<string, unknown> }): Promise<ContractTemplate> {
    const res = await api.post('/contract-templates', data)
    return res.data
  },

  async update(id: number, data: { name?: string; content?: Record<string, unknown> }): Promise<ContractTemplate> {
    const res = await api.put(`/contract-templates/${id}`, data)
    return res.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/contract-templates/${id}`)
  },

  async uploadImage(file: File): Promise<string> {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post('/contracts/upload-image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.url
  },

  async deleteImage(url: string): Promise<void> {
    await api.delete('/contracts/image', { data: { url } })
  },
}
