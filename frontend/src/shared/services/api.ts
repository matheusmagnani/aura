import axios from 'axios'
import { useAuthStore } from '../stores/useAuthStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

let isRefreshing = false

function getTokenExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp ?? null
  } catch { return null }
}

// Request interceptor — injeta token e faz refresh automático se expirar em < 1 dia
api.interceptors.request.use(
  async (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      const exp = getTokenExp(token)
      const oneDayInSeconds = 86400
      if (
        exp &&
        exp - Date.now() / 1000 < oneDayInSeconds &&
        !isRefreshing &&
        !config.url?.includes('/auth/refresh')
      ) {
        isRefreshing = true
        try {
          const { data } = await axios.post(`${API_URL}/api/auth/refresh`, null, {
            headers: { Authorization: `Bearer ${token}` },
          })
          useAuthStore.setState({ token: data.token })
          config.headers.Authorization = `Bearer ${data.token}`
        } catch {
          // refresh falhou — 401 interceptor cuida da expiração
        } finally {
          isRefreshing = false
        }
      } else {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor — redireciona para /login em 401 e normaliza mensagens de erro
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login') window.location.href = '/login'
    }
    const data = error.response?.data
    let message = data?.message || error.message || 'Erro inesperado'
    if (data?.issues?.length) {
      message = data.issues.map((i: { field: string; message: string }) => i.message).join(', ')
    }
    return Promise.reject(new Error(message))
  },
)
