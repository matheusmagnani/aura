import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useAnimationControls } from 'framer-motion'
import { CircleNotch } from '@phosphor-icons/react'
import { authService } from '../../../shared/services/authService'
import { useAuthStore } from '../../../shared/stores/useAuthStore'
import { useToast } from '../../../shared/hooks/useToast'
import { useCepSearch } from '../../../shared/hooks/useCepSearch'
import { validateCNPJ } from '../../../shared/utils/validateDocuments'
import { Input } from '../../../shared/components/ui/Input'
import { Select } from '../../../shared/components/ui/Select'
import { Button } from '../../../shared/components/ui/Button'

import iconeDireito from '../../../assets/icone_fundo_azul.png'
import iconeEsquerdo from '../../../assets/icone_fundo_preto.png'
import logoDesktop from '../../../assets/logo.png'

type Mode = 'login' | 'register'
type RegStep = 'user' | 'company'

const DEPARTMENTS = ['Tecnologia', 'Marketing', 'Financeiro', 'Recursos Humanos', 'Comercial', 'Jurídico', 'Operações', 'Logística', 'Outros']

const UF_OPTIONS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

function formatCNPJ(value: string) {
  const c = value.replace(/\D/g, '').slice(0, 14)
  return c
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function formatPhone(value: string) {
  const c = value.replace(/\D/g, '').slice(0, 11)
  if (c.length <= 10) return c.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return c.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

function formatZipCode(value: string) {
  return value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')
}

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [regStep, setRegStep] = useState<RegStep>('user')
  const isLogin = mode === 'login'

  // Login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Register — step 1 (user)
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')

  // Register — step 2 (company)
  const [companyName, setCompanyName] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [department, setDepartment] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [address, setAddress] = useState('')
  const [addressNumber, setAddressNumber] = useState('')
  const [addressComplement, setAddressComplement] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [registerLoading, setRegisterLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { fetchAddress, isLoading: isLoadingCep } = useCepSearch()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const { addToast: showToast } = useToast()

  // Mobile bar animation controls
  const mobileBarControls = useAnimationControls()
  const mobileLogoControls = useAnimationControls()

  const handleZipCodeChange = useCallback(async (value: string) => {
    const formatted = formatZipCode(value)
    setZipCode(formatted)
    if (value.replace(/\D/g, '').length === 8) {
      const result = await fetchAddress(value.replace(/\D/g, ''))
      if (!result) { showToast('CEP não encontrado', 'warning'); return }
      setAddress(result.street || '')
      setNeighborhood(result.neighborhood || '')
      setCity(result.city || '')
      setState(result.state || '')
    }
  }, [fetchAddress, showToast])

  function switchMode(to: Mode) {
    setMode(to)
    if (to === 'register') setRegStep('user')
  }

  async function handleMobileToRegister() {
    // Phase 1: bar expands + logo grows to cover full screen
    await Promise.all([
      mobileBarControls.start({ height: '100vh', transition: { duration: 0.75, ease: [0.4, 0, 0.2, 1] } }),
      mobileLogoControls.start({ height: 72, transition: { duration: 0.75, ease: [0.4, 0, 0.2, 1] } }),
    ])
    // Switch content while bar covers screen
    setMode('register')
    setRegStep('user')
    // Phase 2: bar collapses back to bottom bar position
    await Promise.all([
      mobileBarControls.start({ height: 80, transition: { duration: 0.65, ease: [0.4, 0, 0.2, 1] } }),
      mobileLogoControls.start({ height: 24, transition: { duration: 0.65, ease: [0.4, 0, 0.2, 1] } }),
    ])
  }

  async function handleMobileToLogin() {
    // Phase 1: bar expands + logo grows to cover full screen
    await Promise.all([
      mobileBarControls.start({ height: '100vh', transition: { duration: 0.75, ease: [0.4, 0, 0.2, 1] } }),
      mobileLogoControls.start({ height: 72, transition: { duration: 0.75, ease: [0.4, 0, 0.2, 1] } }),
    ])
    // Switch content while bar covers screen
    setMode('login')
    // Phase 2: bar collapses back to bottom bar position
    await Promise.all([
      mobileBarControls.start({ height: 80, transition: { duration: 0.65, ease: [0.4, 0, 0.2, 1] } }),
      mobileLogoControls.start({ height: 24, transition: { duration: 0.65, ease: [0.4, 0, 0.2, 1] } }),
    ])
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    try {
      const { token, user } = await authService.login({ email, password })
      setAuth(token, user)
      navigate('/dashboard')
    } catch (error: any) {
      showToast(error.message || 'Erro ao realizar login.', 'danger')
    } finally {
      setLoginLoading(false)
    }
  }

  function clearError(field: string) {
    setErrors(prev => { const next = { ...prev }; delete next[field]; return next })
  }

  function validateUserStep() {
    const e: Record<string, string> = {}
    if (!regName.trim()) e.regName = 'Campo obrigatório'
    if (!regEmail.trim()) e.regEmail = 'Campo obrigatório'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) e.regEmail = 'E-mail inválido'
    if (!regPassword) e.regPassword = 'Campo obrigatório'
    else if (regPassword.length < 6) e.regPassword = 'Mínimo 6 caracteres'
    if (!regConfirmPassword) e.regConfirmPassword = 'Campo obrigatório'
    else if (regPassword !== regConfirmPassword) e.regConfirmPassword = 'As senhas não coincidem'
    return e
  }

  function validateCompanyStep() {
    const e: Record<string, string> = {}
    if (!companyName.trim()) e.companyName = 'Campo obrigatório'
    if (!tradeName.trim()) e.tradeName = 'Campo obrigatório'
    if (!cnpj) e.cnpj = 'Campo obrigatório'
    else if (!validateCNPJ(cnpj)) e.cnpj = 'CNPJ inválido'
    if (!department) e.department = 'Campo obrigatório'
    if (!companyEmail.trim()) e.companyEmail = 'Campo obrigatório'
    if (!companyPhone.trim()) e.companyPhone = 'Campo obrigatório'
    if (!zipCode.trim()) e.zipCode = 'Campo obrigatório'
    if (!address.trim()) e.address = 'Campo obrigatório'
    if (!addressNumber.trim()) e.addressNumber = 'Campo obrigatório'
    if (!neighborhood.trim()) e.neighborhood = 'Campo obrigatório'
    if (!city.trim()) e.city = 'Campo obrigatório'
    if (!state) e.state = 'Campo obrigatório'
    return e
  }

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault()
    const errs = validateUserStep()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      showToast('Preencha todos os campos obrigatórios corretamente.', 'danger')
      return
    }
    setErrors({})
    setRegStep('company')
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    const errs = validateCompanyStep()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      showToast('Preencha todos os campos obrigatórios corretamente.', 'danger')
      return
    }
    setErrors({})
    setRegisterLoading(true)
    try {
      await authService.register({
        name: regName,
        email: regEmail,
        password: regPassword,
        companyName,
        tradeName,
        cnpj,
        department,
        companyEmail,
        phone: companyPhone,
        zipCode,
        address,
        addressNumber,
        addressComplement: addressComplement || undefined,
        neighborhood,
        city,
        state,
      })
      showToast('Conta criada com sucesso! Faça login para continuar.', 'success')
      if (window.innerWidth < 768) {
        await handleMobileToLogin()
      } else {
        switchMode('login')
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Erro ao criar conta.', 'danger')
    } finally {
      setRegisterLoading(false)
    }
  }

  // ── Shared input style for raw inputs (step 2 grid fields)
  const inputPad = { paddingTop: '0.5rem', paddingBottom: '0.5rem', paddingLeft: '0.75rem', paddingRight: '0.75rem' }
  const inputCls = 'w-full bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-app-gray outline-none transition-all duration-300 focus:border-white hover:border-white/40'
  const selectCls = (field: string) => `${inputCls}${errors[field] ? ' border-red-400' : ''}`
  const ErrMsg = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-red-400 text-xs mt-1">{errors[field]}</p> : null

  const DEPARTMENT_OPTIONS = DEPARTMENTS.map(d => ({ value: d, label: d }))
  const UF_OPTIONS_SELECT = UF_OPTIONS.map(uf => ({ value: uf, label: uf }))

  return (
    <div className="min-h-screen bg-app-bg">

      {/* ───────── MOBILE ───────── */}
      <div className="flex md:hidden relative overflow-hidden bg-app-primary" style={{ height: '100svh' }}>

        {/* Orbs — always visible */}
        <div className="absolute inset-0" style={{ zIndex: 0, pointerEvents: 'none' }}>
          <div className="absolute w-64 h-64 rounded-full blur-3xl opacity-15" style={{ top: '-5rem', right: '-5rem', backgroundColor: 'var(--color-app-accent)' }} />
          <div className="absolute w-72 h-72 rounded-full blur-3xl opacity-15" style={{ top: '28%', left: '-10rem', transform: 'translateY(-50%)', backgroundColor: 'var(--color-app-accent)' }} />
          <div className="absolute w-56 h-56 rounded-full blur-3xl opacity-20" style={{ bottom: '-3rem', right: '-3rem', backgroundColor: 'var(--color-app-accent)' }} />
        </div>

        {/* Register form — behind the bar, shown when mode === 'register' */}
        <div
          className="absolute inset-0 flex flex-col"
          style={{ zIndex: 1, opacity: mode === 'register' ? 1 : 0, pointerEvents: mode === 'register' ? 'auto' : 'none' }}
        >
          <div className="shrink-0 flex flex-col items-center" style={{ paddingTop: '1.5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingBottom: '0.5rem' }}>
            <div className="flex justify-center mb-4">
              <img src={iconeDireito} alt="Aura" className="w-10 h-10 object-contain" />
            </div>
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold text-app-secondary">Criar conta</h1>
              <p className="text-white/70 mt-1 text-sm">Preencha os dados abaixo</p>
            </div>
            <div className="flex items-center justify-center gap-3" style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
              <button type="button" onClick={() => regStep === 'company' && setRegStep('user')} className="text-xs font-medium rounded-full transition-colors" style={{ background: regStep === 'user' ? 'var(--color-app-secondary)' : 'rgba(230,194,132,0.1)', color: regStep === 'user' ? 'var(--color-app-primary)' : 'rgba(230,194,132,0.5)', padding: '4px 16px' }}>
                1. Usuário
              </button>
              <div className="w-6 h-px bg-app-secondary/30" />
              <span className="text-xs font-medium rounded-full" style={{ background: regStep === 'company' ? 'var(--color-app-secondary)' : 'rgba(230,194,132,0.1)', color: regStep === 'company' ? 'var(--color-app-primary)' : 'rgba(230,194,132,0.5)', padding: '4px 16px' }}>
                2. Empresa
              </span>
            </div>
          </div>
          <div className="flex-1 flex justify-center" style={{ minHeight: 0 }}>
            <div className="form-scroll w-full flex flex-col overflow-y-auto" style={{ maxWidth: 420, paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingBottom: '6rem' }}>
              {regStep === 'user' && (
                <form onSubmit={handleNextStep} className="flex flex-col gap-5">
                  <Input label="Nome" type="text" value={regName} onChange={(e) => { setRegName(e.target.value); clearError('regName') }} placeholder="Seu nome" error={errors.regName} />
                  <Input label="Email" type="email" value={regEmail} onChange={(e) => { setRegEmail(e.target.value); clearError('regEmail') }} placeholder="seuemail@email.com" error={errors.regEmail} />
                  <Input label="Senha" type="password" value={regPassword} onChange={(e) => { setRegPassword(e.target.value); clearError('regPassword') }} placeholder="*******" error={errors.regPassword} />
                  <Input label="Confirmar senha" type="password" value={regConfirmPassword} onChange={(e) => { setRegConfirmPassword(e.target.value); clearError('regConfirmPassword') }} placeholder="*******" error={errors.regConfirmPassword} />
                  <div className="flex flex-col gap-4 mt-2">
                    <Button type="submit" size="lg" className="w-full" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', height: 'auto' }}>Próximo</Button>
                    <p className="text-center text-sm text-app-gray">
                      <button type="button" onClick={handleMobileToLogin} className="hover:underline">Já tenho uma conta</button>
                    </p>
                  </div>
                </form>
              )}
              {regStep === 'company' && (
                <form onSubmit={handleRegister} className="flex flex-col gap-4">
                  <Input label="Razão Social *" type="text" value={companyName} onChange={(e) => { setCompanyName(e.target.value); clearError('companyName') }} onClear={() => { setCompanyName(''); clearError('companyName') }} placeholder="Empresa Ltda" error={errors.companyName} />
                  <Input label="Nome Fantasia *" type="text" value={tradeName} onChange={(e) => { setTradeName(e.target.value); clearError('tradeName') }} onClear={() => { setTradeName(''); clearError('tradeName') }} placeholder="Nome Fantasia" error={errors.tradeName} />
                  <Input label="CNPJ *" type="text" value={cnpj} onChange={(e) => { setCnpj(formatCNPJ(e.target.value)); clearError('cnpj') }} onClear={() => { setCnpj(''); clearError('cnpj') }} onBlur={() => { if (cnpj && !validateCNPJ(cnpj)) setErrors(p => ({ ...p, cnpj: 'CNPJ inválido' })) }} placeholder="00.000.000/0000-00" error={errors.cnpj} />
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-white">Departamento *</label>
                    <select value={department} onChange={(e) => { setDepartment(e.target.value); clearError('department') }} className={selectCls('department')} style={{ ...inputPad, color: department ? '#fff' : 'var(--color-app-gray)' }}>
                      <option value="" style={{ background: 'var(--color-app-primary)' }}>Selecione</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d} style={{ background: 'var(--color-app-primary)' }}>{d}</option>)}
                    </select>
                    <ErrMsg field="department" />
                  </div>
                  <Input label="Email da empresa *" type="email" value={companyEmail} onChange={(e) => { setCompanyEmail(e.target.value); clearError('companyEmail') }} onClear={() => { setCompanyEmail(''); clearError('companyEmail') }} placeholder="contato@empresa.com" error={errors.companyEmail} />
                  <Input label="Telefone *" type="text" value={companyPhone} onChange={(e) => { setCompanyPhone(formatPhone(e.target.value)); clearError('companyPhone') }} onClear={() => { setCompanyPhone(''); clearError('companyPhone') }} placeholder="(00) 00000-0000" error={errors.companyPhone} />
                  <div className="relative flex flex-col gap-2">
                    <label className="text-sm font-medium text-white">CEP *</label>
                    <input type="text" value={zipCode} onChange={(e) => { handleZipCodeChange(e.target.value); clearError('zipCode') }} placeholder="00000-000" disabled={isLoadingCep} className={selectCls('zipCode')} style={{ ...inputPad, paddingRight: '2.5rem' }} />
                    {isLoadingCep && <CircleNotch className="absolute right-3 bottom-2.5 w-5 h-5 text-app-secondary animate-spin" weight="bold" />}
                    <ErrMsg field="zipCode" />
                  </div>
                  <Input label="Rua *" type="text" value={address} onChange={(e) => { setAddress(e.target.value); clearError('address') }} onClear={() => { setAddress(''); clearError('address') }} placeholder="Rua, Avenida..." error={errors.address} />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Input label="Número *" type="text" value={addressNumber} onChange={(e) => { setAddressNumber(e.target.value); clearError('addressNumber') }} onClear={() => { setAddressNumber(''); clearError('addressNumber') }} placeholder="123" error={errors.addressNumber} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-white">UF *</label>
                      <select value={state} onChange={(e) => { setState(e.target.value); clearError('state') }} className={selectCls('state')} style={{ ...inputPad, color: state ? '#fff' : 'var(--color-app-gray)' }}>
                        <option value="" style={{ background: 'var(--color-app-primary)' }}>UF</option>
                        {UF_OPTIONS.map(uf => <option key={uf} value={uf} style={{ background: 'var(--color-app-primary)' }}>{uf}</option>)}
                      </select>
                      <ErrMsg field="state" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Input label="Bairro *" type="text" value={neighborhood} onChange={(e) => { setNeighborhood(e.target.value); clearError('neighborhood') }} onClear={() => { setNeighborhood(''); clearError('neighborhood') }} placeholder="Bairro" error={errors.neighborhood} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Input label="Cidade *" type="text" value={city} onChange={(e) => { setCity(e.target.value); clearError('city') }} onClear={() => { setCity(''); clearError('city') }} placeholder="Cidade" error={errors.city} />
                    </div>
                  </div>
                  <Input label="Complemento" type="text" value={addressComplement} onChange={(e) => setAddressComplement(e.target.value)} onClear={() => setAddressComplement('')} placeholder="Apto, Sala..." />
                  <div className="flex gap-3 mt-2">
                    <Button type="button" onClick={() => setRegStep('user')} size="lg" className="flex-1" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', height: 'auto', background: 'none', border: '1px solid rgba(230,194,132,0.3)', color: 'rgba(230,194,132,0.7)' }}>Voltar</Button>
                    <Button type="submit" disabled={registerLoading} size="lg" className="flex-1" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', height: 'auto' }}>
                      {registerLoading && <CircleNotch size={18} className="animate-spin" />}
                      Cadastrar
                    </Button>
                  </div>
                  <p className="text-center text-sm text-app-gray">
                    <button type="button" onClick={handleMobileToLogin} className="hover:underline">Já tenho uma conta</button>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Login content — hidden instantly while bar covers screen */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 2, pointerEvents: isLogin ? 'auto' : 'none', opacity: isLogin ? 1 : 0, paddingTop: '1rem', paddingBottom: '6rem', paddingLeft: '2rem', paddingRight: '2rem' }}>
          <div className="w-full max-w-xs flex flex-col gap-4">
            <div className="flex justify-start">
              <img src={iconeDireito} alt="Aura" className="w-12 h-12 object-contain" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-app-secondary">Bem vindo de volta!</h1>
              <p className="text-white/70 mt-1 text-sm">Faça login pra continuar</p>
            </div>
            <form onSubmit={handleLogin} className="flex flex-col gap-8 w-full">
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@email.com" required />
              <Input label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="*******" required />
              <div className="flex flex-col gap-5">
                <Button type="submit" variant="primary" disabled={loginLoading} size="lg" className="w-full" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', height: 'auto' }}>
                  {loginLoading && <CircleNotch size={18} className="animate-spin" />}
                  Entrar
                </Button>
                <p className="text-center text-sm text-app-gray">
                  <button type="button" onClick={handleMobileToRegister} className="hover:underline">
                    Não tenho uma conta
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Bottom bar — expands to cover screen, then collapses */}
        <motion.div
          animate={mobileBarControls}
          initial={{ height: 80 }}
          className="absolute bottom-0 left-0 right-0 flex items-center justify-center overflow-hidden"
          style={{ zIndex: 3, background: 'linear-gradient(to top, #171514 0%, #1a3a4a 100%)' }}
        >
          <div className="absolute top-0 left-0 right-0" style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.6) 50%, transparent)' }} />
          <motion.img
            animate={mobileLogoControls}
            initial={{ height: 24 }}
            src={logoDesktop}
            alt="Aura"
            style={{ objectFit: 'contain', display: 'block' }}
          />
        </motion.div>

      </div>

      {/* ───────── DESKTOP ───────── */}
      <div className="hidden md:flex min-h-screen relative overflow-hidden">

        {/* Register form — LEFT */}
        <div className="w-1/2 h-screen bg-app-primary flex flex-col relative overflow-hidden">
          <div style={{ zIndex: 0 }}>
            <div className="orb-1 absolute w-64 h-64 rounded-full blur-3xl opacity-15" style={{ top: '-5rem', left: '-5rem', backgroundColor: 'var(--color-app-accent)' }} />
            <div className="orb-2 absolute w-72 h-72 rounded-full blur-3xl opacity-15" style={{ top: '28%', right: '-10rem', transform: 'translateY(-50%)', backgroundColor: 'var(--color-app-accent)' }} />
            <div className="orb-3 absolute w-56 h-56 rounded-full blur-3xl opacity-20" style={{ bottom: '-3rem', left: '-3rem', backgroundColor: 'var(--color-app-accent)' }} />
          </div>

          {/* Fixed header */}
          <div className="relative flex-shrink-0 flex flex-col items-center" style={{ zIndex: 1, paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '3.5rem' }}>
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <img src={iconeDireito} alt="Aura" className="w-12 h-12 object-contain" />
            </div>

            {/* Title */}
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-app-secondary">Criar conta</h1>
              <p className="text-white/70 mt-1 text-sm">Preencha os dados abaixo</p>
            </div>

            {/* Step indicators */}
            <div className="flex items-center justify-center gap-3" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => regStep === 'company' && setRegStep('user')}
                className="text-xs font-medium rounded-full transition-colors"
                style={{ background: regStep === 'user' ? 'var(--color-app-secondary)' : 'rgba(230,194,132,0.1)', color: regStep === 'user' ? 'var(--color-app-primary)' : 'rgba(230,194,132,0.5)', padding: '4px 16px' }}
              >
                1. Usuário
              </button>
              <div className="w-6 h-px bg-app-secondary/30" />
              <span
                className="text-xs font-medium rounded-full"
                style={{ background: regStep === 'company' ? 'var(--color-app-secondary)' : 'rgba(230,194,132,0.1)', color: regStep === 'company' ? 'var(--color-app-primary)' : 'rgba(230,194,132,0.5)', padding: '4px 16px' }}
              >
                2. Empresa
              </span>
            </div>
          </div>

          {/* Scrollable form area */}
          <div className="relative flex-1 flex justify-center" style={{ zIndex: 1, minHeight: 0 }}>
          <div className="form-scroll w-full flex flex-col pb-8 overflow-y-auto" style={{ maxWidth: 420, paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>

            {/* Step 1: User */}
            {regStep === 'user' && (
              <form onSubmit={handleNextStep} className="flex flex-col gap-5">
                <Input label="Nome" type="text" value={regName} onChange={(e) => { setRegName(e.target.value); clearError('regName') }} placeholder="Seu nome" error={errors.regName} />
                <Input label="Email" type="email" value={regEmail} onChange={(e) => { setRegEmail(e.target.value); clearError('regEmail') }} placeholder="seuemail@email.com" error={errors.regEmail} />
                <Input label="Senha" type="password" value={regPassword} onChange={(e) => { setRegPassword(e.target.value); clearError('regPassword') }} placeholder="*******" error={errors.regPassword} />
                <Input label="Confirmar senha" type="password" value={regConfirmPassword} onChange={(e) => { setRegConfirmPassword(e.target.value); clearError('regConfirmPassword') }} placeholder="*******" error={errors.regConfirmPassword} />
                <div className="flex flex-col gap-4 mt-2">
                  <Button type="submit" size="lg" className="w-full" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', height: 'auto' }}>
                    Próximo
                  </Button>
                  <p className="text-center text-sm text-app-gray">
                    <button type="button" onClick={() => switchMode('login')} className="hover:underline">
                      Já tenho uma conta
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* Step 2: Company */}
            {regStep === 'company' && (
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <Input label="Razão Social *" type="text" value={companyName} onChange={(e) => { setCompanyName(e.target.value); clearError('companyName') }} onClear={() => { setCompanyName(''); clearError('companyName') }} placeholder="Empresa Ltda" error={errors.companyName} />
                <Input label="Nome Fantasia *" type="text" value={tradeName} onChange={(e) => { setTradeName(e.target.value); clearError('tradeName') }} onClear={() => { setTradeName(''); clearError('tradeName') }} placeholder="Nome Fantasia" error={errors.tradeName} />
                <Input label="CNPJ *" type="text" value={cnpj} onChange={(e) => { setCnpj(formatCNPJ(e.target.value)); clearError('cnpj') }} onClear={() => { setCnpj(''); clearError('cnpj') }} onBlur={() => { if (cnpj && !validateCNPJ(cnpj)) setErrors(p => ({ ...p, cnpj: 'CNPJ inválido' })) }} placeholder="00.000.000/0000-00" error={errors.cnpj} />
                <div className="flex flex-col gap-2">
                  <Select
                    label="Departamento *"
                    value={department}
                    onChange={(v) => { setDepartment(v); clearError('department') }}
                    options={DEPARTMENT_OPTIONS}
                    error={errors.department}
                  />
                </div>
                <Input label="Email da empresa *" type="email" value={companyEmail} onChange={(e) => { setCompanyEmail(e.target.value); clearError('companyEmail') }} onClear={() => { setCompanyEmail(''); clearError('companyEmail') }} placeholder="contato@empresa.com" error={errors.companyEmail} />
                <Input label="Telefone *" type="text" value={companyPhone} onChange={(e) => { setCompanyPhone(formatPhone(e.target.value)); clearError('companyPhone') }} onClear={() => { setCompanyPhone(''); clearError('companyPhone') }} placeholder="(00) 00000-0000" error={errors.companyPhone} />
                <div className="relative flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">CEP *</label>
                  <input type="text" value={zipCode} onChange={(e) => { handleZipCodeChange(e.target.value); clearError('zipCode') }} placeholder="00000-000" disabled={isLoadingCep} className={selectCls('zipCode')} style={{ ...inputPad, paddingRight: '2.5rem' }} />
                  {isLoadingCep && <CircleNotch className="absolute right-3 bottom-2.5 w-5 h-5 text-app-secondary animate-spin" weight="bold" />}
                  <ErrMsg field="zipCode" />
                </div>
                <Input label="Rua *" type="text" value={address} onChange={(e) => { setAddress(e.target.value); clearError('address') }} onClear={() => { setAddress(''); clearError('address') }} placeholder="Rua, Avenida..." error={errors.address} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Input label="Número *" type="text" value={addressNumber} onChange={(e) => { setAddressNumber(e.target.value); clearError('addressNumber') }} onClear={() => { setAddressNumber(''); clearError('addressNumber') }} placeholder="123" error={errors.addressNumber} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Select
                      label="UF *"
                      value={state}
                      onChange={(v) => { setState(v); clearError('state') }}
                      options={UF_OPTIONS_SELECT}
                      placeholder="UF"
                      error={errors.state}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Input label="Bairro *" type="text" value={neighborhood} onChange={(e) => { setNeighborhood(e.target.value); clearError('neighborhood') }} onClear={() => { setNeighborhood(''); clearError('neighborhood') }} placeholder="Bairro" error={errors.neighborhood} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Input label="Cidade *" type="text" value={city} onChange={(e) => { setCity(e.target.value); clearError('city') }} onClear={() => { setCity(''); clearError('city') }} placeholder="Cidade" error={errors.city} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white">Complemento</label>
                  <input type="text" value={addressComplement} onChange={(e) => setAddressComplement(e.target.value)} placeholder="Apto, Sala..." className={inputCls} style={inputPad} />
                </div>
                <div className="flex gap-3 mt-2">
                  <Button type="button" onClick={() => setRegStep('user')} size="lg" className="flex-1" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', height: 'auto', background: 'none', border: '1px solid rgba(230,194,132,0.3)', color: 'rgba(230,194,132,0.7)' }}>
                    Voltar
                  </Button>
                  <Button type="submit" disabled={registerLoading} size="lg" className="flex-1" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', height: 'auto' }}>
                    {registerLoading && <CircleNotch size={18} className="animate-spin" />}
                    Cadastrar
                  </Button>
                </div>
                <p className="text-center text-sm text-app-gray">
                  <button type="button" onClick={() => switchMode('login')} className="hover:underline">
                    Já tenho uma conta
                  </button>
                </p>
              </form>
            )}
          </div>
          </div>
        </div>

        {/* Login form — RIGHT */}
        <div className="w-1/2 min-h-screen bg-app-primary flex items-center justify-center relative overflow-hidden">
          <div style={{ zIndex: 0 }}>
            <div className="orb-1 absolute w-64 h-64 rounded-full blur-3xl opacity-15" style={{ top: '-5rem', right: '-5rem', backgroundColor: 'var(--color-app-accent)' }} />
            <div className="orb-2 absolute w-72 h-72 rounded-full blur-3xl opacity-15" style={{ top: '28%', left: '-10rem', transform: 'translateY(-50%)', backgroundColor: 'var(--color-app-accent)' }} />
            <div className="orb-3 absolute w-56 h-56 rounded-full blur-3xl opacity-20" style={{ bottom: '-3rem', right: '-3rem', backgroundColor: 'var(--color-app-accent)' }} />
          </div>
          <div className="relative w-full max-w-xs flex flex-col gap-8 px-8" style={{ zIndex: 1 }}>
            <div className="flex justify-center">
              <img src={iconeDireito} alt="Aura" className="w-12 h-12 object-contain" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-app-secondary">Bem vindo de volta!</h1>
              <p className="text-white/70 mt-1 text-sm">Faça login pra continuar</p>
            </div>
            <form onSubmit={handleLogin} className="flex flex-col gap-8 w-full">
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@email.com" required />
              <Input label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="*******" required />
              <div className="flex flex-col gap-5">
                <Button type="submit" variant="primary" disabled={loginLoading} size="lg" className="w-full" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', height: 'auto' }}>
                  {loginLoading && <CircleNotch size={18} className="animate-spin" />}
                  Entrar
                </Button>
                <p className="text-center text-sm text-app-gray">
                  <button type="button" onClick={() => switchMode('register')} className="hover:underline">
                    Não tenho uma conta
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* ── Sliding panel ── */}
        <motion.div
          className="absolute top-0 bottom-0 w-1/2 flex items-center justify-center"
          style={{ left: 0, zIndex: 20, backgroundColor: 'var(--color-app-bg)' }}
          initial={false}
          animate={{ x: isLogin ? '0%' : '100%' }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Gradient borders */}
          <div className="absolute top-0 right-0 bottom-0" style={{ width: '1px', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.6) 50%, transparent)' }} />
          <div className="absolute top-0 left-0 bottom-0" style={{ width: '1px', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.6) 50%, transparent)' }} />

          {/* Glow circle */}
          <div style={{
            position: 'absolute', width: 320, height: 320, borderRadius: '50%',
            background: 'var(--color-app-accent)', opacity: isLogin ? 0.3 : 0,
            filter: 'blur(48px)', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: isLogin ? 'flex-start' : 'center', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
            <motion.div
              layout
              animate={{ x: isLogin ? 0 : 115, y: isLogin ? 0 : 20 }}
              initial={{ x: 0, y: 0 }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              style={{ position: 'relative', flexShrink: 0, width: isLogin ? 256 : 64, height: isLogin ? 256 : 64 }}
            >
              <img src={iconeEsquerdo} alt="Aura" style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative' }} />
            </motion.div>

            <motion.img
              layout
              src={logoDesktop}
              alt="Aura"
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              style={{ height: isLogin ? 40 : 112, objectFit: 'contain', display: 'block', marginLeft: isLogin ? '20px' : 0 }}
            />
          </div>
        </motion.div>

      </div>
    </div>
  )
}
