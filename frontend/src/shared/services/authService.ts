import { api } from './api'

interface LoginPayload {
  email: string
  password: string
}

interface RegisterPayload {
  companyName: string
  name: string
  email: string
  password: string
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

interface MeResponse {
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
  }
  createdAt: string
}

export const authService = {
  async login(data: LoginPayload): Promise<AuthResponse> {
    const response = await api.post('/auth/login', data)
    return response.data
  },

  async register(data: RegisterPayload): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data)
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
}
