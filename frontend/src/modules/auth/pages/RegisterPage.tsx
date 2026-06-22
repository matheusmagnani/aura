import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Buildings,
  User,
  Envelope,
  Lock,
  CircleNotch,
  Key,
  ArrowLeft,
} from '@phosphor-icons/react'
import { authService } from '../../../shared/services/authService'
import { useAuthStore } from '../../../shared/stores/useAuthStore'
import { useToast } from '../../../shared/hooks/useToast'
import { getApiError } from '../../../shared/utils/getApiError'

type Step = 'code' | 'form'

export function RegisterPage() {
  const [step, setStep] = useState<Step>('code')
  const [inviteCode, setInviteCode] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const { addToast: showToast } = useToast()

  async function handleValidateCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      await authService.validateInvite(inviteCode)
      setStep('form')
    } catch (error: any) {
      showToast(getApiError(error), 'danger')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { token, user } = await authService.register({
        inviteCode,
        companyName,
        name,
        email,
        password,
      })
      setAuth(token, user)
      showToast('Conta criada com sucesso!', 'success')
      navigate('/dashboard')
    } catch (error: any) {
      showToast(getApiError(error), 'danger')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg">
      <div className="w-full max-w-md px-8">

        {step === 'code' ? (
          <div className="flex flex-col items-center">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-app-secondary">Aura</h1>
              <p className="text-app-gray mt-2">Crie sua conta</p>
            </div>
            <form onSubmit={handleValidateCode} className="space-y-4 w-full">
              <div>
                <label className="block text-sm text-app-gray mb-1">
                  Código de acesso
                </label>
                <div className="relative">
                  <Key
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-app-gray"
                  />
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    required
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
                Próximo
              </button>
            </form>
            <p className="text-center text-sm text-app-gray mt-6">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-app-secondary hover:underline">
                Entrar
              </Link>
            </p>
          </div>
        ) : (
          <>
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

            <button
              type="button"
              onClick={() => setStep('code')}
              className="w-full flex items-center justify-center gap-2 text-sm text-app-gray hover:text-app-secondary transition"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
          </form>
          <p className="text-center text-sm text-app-gray mt-6">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-app-secondary hover:underline">
              Entrar
            </Link>
          </p>
          </>
        )}
      </div>
    </div>
  )
}
