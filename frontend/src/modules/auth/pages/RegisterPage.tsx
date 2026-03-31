import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Buildings,
  User,
  Envelope,
  Lock,
  CircleNotch,
} from '@phosphor-icons/react'
import { authService } from '../../../shared/services/authService'
import { useAuthStore } from '../../../shared/stores/useAuthStore'
import { useToast } from '../../../shared/hooks/useToast'

export function RegisterPage() {
  const [companyName, setCompanyName] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const showToast = useToast((s) => s.show)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { token, user } = await authService.register({
        companyName,
        name,
        email,
        password,
      })
      setAuth(token, user)
      showToast('Conta criada com sucesso!', 'success')
      navigate('/dashboard')
    } catch (error: any) {
      const msg =
        error.response?.data?.message || 'Erro ao criar conta.'
      showToast(msg, 'danger')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg">
      <div className="w-full max-w-md px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-app-secondary">Aura</h1>
          <p className="text-app-gray mt-2">Crie sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-app-gray mb-1">
              Nome da empresa
            </label>
            <div className="relative">
              <Buildings
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-app-gray"
              />
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Minha Empresa"
                required
                className="w-full bg-app-primary border border-white/10 rounded-lg px-10 py-3 text-sm text-white placeholder-app-gray focus:outline-none focus:border-app-secondary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-app-gray mb-1">
              Seu nome
            </label>
            <div className="relative">
              <User
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-app-gray"
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="João Silva"
                required
                className="w-full bg-app-primary border border-white/10 rounded-lg px-10 py-3 text-sm text-white placeholder-app-gray focus:outline-none focus:border-app-secondary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-app-gray mb-1">E-mail</label>
            <div className="relative">
              <Envelope
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-app-gray"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full bg-app-primary border border-white/10 rounded-lg px-10 py-3 text-sm text-white placeholder-app-gray focus:outline-none focus:border-app-secondary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-app-gray mb-1">Senha</label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-app-gray"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className="w-full bg-app-primary border border-white/10 rounded-lg px-10 py-3 text-sm text-white placeholder-app-gray focus:outline-none focus:border-app-secondary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-app-secondary text-app-primary font-semibold py-3 rounded-lg hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <CircleNotch size={18} className="animate-spin" />}
            Criar conta
          </button>
        </form>

        <p className="text-center text-sm text-app-gray mt-6">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-app-secondary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
