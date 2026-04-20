import { api } from '../../../shared/services/api'

export interface CompanyInfo {
  id: number
  name: string
  tradeName: string | null
  cnpj: string | null
  department: string | null
  email: string | null
  phone: string | null
  address: string | null
  addressNumber: string | null
  addressComplement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  zipCode: string | null
}

export interface UpdateCompanyInfoDTO {
  companyName?: string
  tradeName?: string
  cnpj?: string
  department?: string
  email?: string
  phone?: string
  address?: string
  addressNumber?: string
  addressComplement?: string
  neighborhood?: string
  city?: string
  state?: string
  zipCode?: string
}

export const settingsService = {
  async getCompanyInfo(): Promise<CompanyInfo> {
    const response = await api.get<CompanyInfo>('/settings/company')
    return response.data
  },

  async updateCompanyInfo(data: UpdateCompanyInfoDTO): Promise<CompanyInfo> {
    const response = await api.put<CompanyInfo>('/settings/company', data)
    return response.data
  },
}
