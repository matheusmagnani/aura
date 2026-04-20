import { api } from './api'
import { useAuthStore } from '../stores/useAuthStore'

interface LoginPayload {
  email: string
  password: string
}

interface RegisterPayload {
  companyName: string
  name: string
  email: string
  password: string
  tradeName?: string
  cnpj?: string
  department?: string
  companyEmail?: string
  phone?: string
  zipCode?: string
  address?: string
  addressNumber?: string
  addressComplement?: string
  neighborhood?: string
  city?: string
  state?: string
}

interface AuthResponse {
  token: string
  user: {
    id: number
    name: string
    email: string
    avatar?: string
    companyId: number
    companyName: string
    roleId: number | null
    role: { id: number; name: string } | null
  }
}

export interface MeResponse {
  id: number
  name: string
  email: string
  avatar: string | null
  active: boolean
  companyId: number
  roleId: number | null
  role: { id: number; name: string } | null
  company: {
    id: number
    name: string
    tradeName: string | null
    cnpj: string | null
    email: string | null
    phone: string | null
    department: string | null
    zipCode: string | null
    address: string | null
    addressNumber: string | null
    addressComplement: string | null
    neighborhood: string | null
    city: string | null
    state: string | null
  }
  createdAt: string
}

export const authService = {
  async login(data: LoginPayload): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data)
    const { token, user } = response.data
    useAuthStore.getState().setAuth(token, user)
    return response.data
  },

  logout() {
    useAuthStore.getState().logout()
  },

  isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated()
  },

  getUser() {
    return useAuthStore.getState().user
  },

  async register(data: RegisterPayload): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data)
    return response.data
  },

  async refresh(): Promise<{ token: string }> {
    const response = await api.post('/auth/refresh')
    return response.data
  },

  async me(): Promise<MeResponse> {
    const response = await api.get('/auth/me')
    return response.data
  },

  async updateProfile(data: { name: string; email: string }): Promise<{ id: number; name: string; email: string; avatar: string | null }> {
    const response = await api.put('/auth/me', data)
    return response.data
  },

  async uploadAvatar(file: File): Promise<{ avatar: string }> {
    const form = new FormData()
    form.append('file', file)
    const response = await api.post<{ avatar: string }>('/auth/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async removeAvatar(): Promise<void> {
    await api.delete('/auth/me/avatar')
  },

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    await api.put('/auth/me/password', data)
  },
}
