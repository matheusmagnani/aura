import { useState, useRef, useEffect } from 'react'
import { DoorOpen, PencilSimple, CaretUp, Key } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { authService } from '../services/authService'
import { useAuthStore } from '../stores/useAuthStore'
import { useToast } from '../hooks/useToast'
import { Modal } from './Modal'
import { Input } from './ui/Input'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

const PREPOSITIONS = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])

export function Header() {
  const navigate = useNavigate()
  const storeUser = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const logout = useAuthStore((s) => s.logout)
  const { addToast } = useToast()

  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string
    newPassword?: string
    confirmNewPassword?: string
  }>({})
  const [savingPassword, setSavingPassword] = useState(false)
  const [expandedHeight, setExpandedHeight] = useState(0)
  const [headerBarHeight, setHeaderBarHeight] = useState(0)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  const wrapperRef = useRef<HTMLDivElement>(null)
  const headerBarRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: me } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => authService.me(),
    enabled: expanded,
    staleTime: 1000 * 60 * 5,
  })

  useEffect(() => {
    function calc() {
      const barH = headerBarRef.current?.offsetHeight || 0
      setHeaderBarHeight(barH)
      setExpandedHeight(window.innerHeight - barH)
      setIsMobile(window.innerWidth < 768)
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setExpanded(false)
        setEditing(false)
        setAvatarMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const user = storeUser
  const company = me?.company

  const initials = user?.name
    ? user.name
        .split(' ')
        .filter((n) => !PREPOSITIONS.has(n.toLowerCase()))
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U'

  const avatarUrl = user?.avatar ? `${API_URL}/uploads/${user.avatar}` : null

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function startEditing() {
    setEditName(user?.name || '')
    setEditEmail(user?.email || '')
    setEditing(true)
    setAvatarMenuOpen(false)
  }

  async function saveProfile() {
    setSaving(true)
    try {
      const updated = await authService.updateProfile({ name: editName, email: editEmail })
      updateUser({ name: updated.name, email: updated.email })
      setEditing(false)
      addToast('Dados atualizados com sucesso', 'success')
    } catch (err: any) {
      addToast(err?.response?.data?.message || err.message || 'Erro ao salvar', 'danger')
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const result = await authService.uploadAvatar(file)
      updateUser({ avatar: result.avatar })
    } catch (err: any) {
      addToast(err?.response?.data?.message || err.message || 'Erro ao enviar foto', 'danger')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
    setAvatarMenuOpen(false)
  }

  async function handleRemoveAvatar() {
    try {
      await authService.removeAvatar()
      updateUser({ avatar: undefined })
    } catch (err: any) {
      addToast(err?.response?.data?.message || err.message || 'Erro ao remover foto', 'danger')
    }
    setAvatarMenuOpen(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    const errors: typeof passwordErrors = {}
    if (!currentPassword) errors.currentPassword = 'Senha atual é obrigatória'
    if (!newPassword) errors.newPassword = 'Nova senha é obrigatória'
    else if (newPassword.length < 6) errors.newPassword = 'Nova senha deve ter no mínimo 6 caracteres'
    if (!confirmNewPassword) errors.confirmNewPassword = 'Confirmação é obrigatória'
    else if (newPassword !== confirmNewPassword) errors.confirmNewPassword = 'As senhas não coincidem'
    setPasswordErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSavingPassword(true)
    try {
      await authService.changePassword({ currentPassword, newPassword })
      setPasswordModalOpen(false)
      addToast('Senha alterada com sucesso!', 'success')
    } catch (err: any) {
      addToast(err?.response?.data?.message || err.message || 'Erro ao alterar senha', 'danger')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative z-40 md:sticky md:top-0">
      <div ref={headerBarRef}>
        <div className="bg-app-primary border-b border-white/10">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarUpload}
          />

          <motion.div
            className="flex items-center justify-between"
            initial={{ paddingTop: 14, paddingBottom: 14, paddingLeft: 16, paddingRight: 16 }}
            animate={{
              paddingTop: expanded ? (isMobile ? 24 : 48) : (isMobile ? 32 : 14),
              paddingBottom: expanded ? (isMobile ? 12 : 24) : (isMobile ? 20 : 14),
              paddingLeft: expanded ? (isMobile ? 20 : 48) : 16,
              paddingRight: expanded ? (isMobile ? 20 : 48) : 16,
            }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="flex flex-col items-start">
              {expanded && editing ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-transparent border border-white/50 rounded-lg px-4 py-2 text-white font-medium outline-none w-full focus:border-white transition-colors"
                  style={{ fontSize: isMobile ? '1.25rem' : '1.875rem' }}
                  placeholder="Nome"
                />
              ) : (
                <motion.p
                  className="leading-[1.19] font-medium text-white text-left"
                  style={{ marginTop: isMobile ? '0.75rem' : '0' }}
                  initial={{ fontSize: '1rem' }}
                  animate={{ fontSize: expanded ? (isMobile ? '1.25rem' : '1.875rem') : '1rem' }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                >
                  {user?.name || 'Usuário'}
                </motion.p>
              )}

              <AnimatePresence mode="wait">
                {!expanded ? (
                  <motion.p
                    key="company"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs font-normal text-app-accent text-left"
                  >
                    {company?.tradeName || company?.name || user?.companyName || ''}
                  </motion.p>
                ) : (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: '0.5rem' }}
                  >
                    {editing ? (
                      <>
                        <input
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="bg-transparent border border-white/30 rounded-lg px-4 py-2 text-white/70 outline-none focus:border-white/50 transition-colors"
                          style={{ fontSize: isMobile ? '0.8rem' : '1rem' }}
                          placeholder="Email"
                        />
                        <p style={{ marginTop: '0.5rem', fontSize: isMobile ? '0.8rem' : '1.125rem', color: 'rgba(255,255,255,0.5)' }}>
                          Setor: {me?.role?.name || 'Sem setor'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: isMobile ? '0.8rem' : '1.125rem', color: 'rgba(255,255,255,0.5)' }}>Email: {user?.email || '—'}</p>
                        <p style={{ fontSize: isMobile ? '0.8rem' : '1.125rem', color: 'rgba(255,255,255,0.5)' }}>
                          Setor: {me?.role?.name || 'Sem setor'}
                        </p>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative flex-shrink-0">
              <motion.button
                onClick={() => { if (!editing && !expanded) setExpanded(true) }}
                className={`rounded-full flex items-center justify-center overflow-hidden cursor-pointer border-0 outline-none p-0 ${avatarUrl ? 'bg-transparent' : 'bg-app-secondary'}`}
                initial={{ width: 36, height: 36 }}
                animate={{ width: expanded ? (isMobile ? 56 : 80) : 36, height: expanded ? (isMobile ? 56 : 80) : 36 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <motion.span
                    className="text-app-primary font-semibold"
                    initial={{ fontSize: '0.75rem' }}
                    animate={{ fontSize: expanded ? (isMobile ? '1rem' : '1.5rem') : '0.75rem' }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  >
                    {initials}
                  </motion.span>
                )}
              </motion.button>

              {expanded && editing && (
                <button
                  onClick={() => setAvatarMenuOpen((v) => !v)}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-app-secondary rounded-full flex items-center justify-center cursor-pointer border-0 shadow-md"
                >
                  <PencilSimple className="w-3.5 h-3.5 text-app-primary" weight="bold" />
                </button>
              )}

              {avatarMenuOpen && (
                <div className="absolute top-full right-0 mt-2 bg-app-primary border border-white/20 rounded-lg shadow-lg overflow-hidden z-50 min-w-[150px]">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-3 text-center text-sm text-white hover:bg-white/10 cursor-pointer border-0 bg-transparent"
                  >
                    {avatarUrl ? 'Mudar foto' : 'Adicionar foto'}
                  </button>
                  {avatarUrl && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="w-full px-4 py-3 text-center text-sm text-red-400 hover:bg-white/10 cursor-pointer border-0 bg-transparent"
                    >
                      Remover foto
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Expanded content — absolute para não empurrar o conteúdo abaixo */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: expandedHeight, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            style={{ position: 'absolute', left: 0, right: 0, overflow: 'hidden', background: 'var(--color-app-primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', zIndex: 40 }}
          >
              <div style={{ height: '100%', paddingLeft: isMobile ? '20px' : '3rem', paddingRight: isMobile ? '20px' : '3rem', paddingBottom: '6rem' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-start', gap: '0.75rem', marginBottom: isMobile ? '2rem' : '4rem', marginTop: isMobile ? '0.75rem' : '1.25rem' }}>
                  <button
                    onClick={editing ? () => { setEditing(false); setAvatarMenuOpen(false) } : startEditing}
                    disabled={saving}
                    style={{ padding: isMobile ? '0.6rem 1.25rem' : '1.25rem 2.5rem', fontSize: isMobile ? '0.875rem' : '1.125rem', fontWeight: 600, borderRadius: isMobile ? '0.5rem' : '1rem', cursor: 'pointer', border: editing ? '1px solid rgba(255,255,255,0.5)' : 'none', background: editing ? 'transparent' : 'var(--color-app-secondary)', color: editing ? 'white' : 'var(--color-app-primary)', opacity: saving ? 0.5 : 1, transition: 'filter 0.2s' }}
                  >
                    {editing ? 'Cancelar' : (isMobile ? 'Editar' : 'Editar dados do usuário')}
                  </button>
                  {editing && (
                    <button
                      onClick={saveProfile}
                      disabled={saving}
                      style={{ padding: isMobile ? '0.6rem 1.25rem' : '1.25rem 2.5rem', fontSize: isMobile ? '0.875rem' : '1.125rem', fontWeight: 600, borderRadius: isMobile ? '0.5rem' : '1rem', cursor: 'pointer', border: 'none', background: 'var(--color-app-secondary)', color: 'var(--color-app-primary)', opacity: saving ? 0.5 : 1 }}
                    >
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  )}
                  {!editing && (
                    <button
                      onClick={() => {
                        setCurrentPassword('')
                        setNewPassword('')
                        setConfirmNewPassword('')
                        setPasswordErrors({})
                        setPasswordModalOpen(true)
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: isMobile ? '0.6rem 1.25rem' : '1.25rem 2.5rem', fontSize: isMobile ? '0.875rem' : '1.125rem', fontWeight: 600, borderRadius: isMobile ? '0.5rem' : '1rem', cursor: 'pointer', background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.5)' }}
                    >
                      <Key size={isMobile ? 16 : 20} weight="regular" />
                      Alterar senha
                    </button>
                  )}
                </div>

                {company && (
                  <div style={{ paddingLeft: isMobile ? '0' : '2rem', paddingRight: isMobile ? '0' : '2rem', paddingTop: isMobile ? '2rem' : '0' }}>
                    <h2 style={{ fontSize: isMobile ? '1rem' : '1.375rem', fontWeight: 500, color: 'var(--color-app-accent)' }}>
                      {company.tradeName || company.name}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '0.25rem' : '0.5rem 2rem', marginTop: '0.75rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {company.tradeName && (
                          <p style={{ fontSize: isMobile ? '0.8rem' : '1rem', color: 'rgba(255,255,255,0.5)' }}>Razão Social: {company.name}</p>
                        )}
                        {company.cnpj && (
                          <p style={{ fontSize: isMobile ? '0.8rem' : '1rem', color: 'rgba(255,255,255,0.5)' }}>CNPJ: {company.cnpj}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {company.email && (
                          <p style={{ fontSize: isMobile ? '0.8rem' : '1rem', color: 'rgba(255,255,255,0.5)' }}>Email: {company.email}</p>
                        )}
                        {company.phone && (
                          <p style={{ fontSize: isMobile ? '0.8rem' : '1rem', color: 'rgba(255,255,255,0.5)' }}>Telefone: {company.phone}</p>
                        )}
                      </div>
                    </div>
                    {(company.address || company.city) && (
                      <div style={{ marginTop: isMobile ? '1rem' : '2rem' }}>
                        {company.address && (
                          <p style={{ fontSize: isMobile ? '0.8rem' : '1rem', color: 'rgba(255,255,255,0.5)' }}>{company.address}</p>
                        )}
                        <p style={{ fontSize: isMobile ? '0.8rem' : '1rem', color: 'rgba(255,255,255,0.5)' }}>
                          {[company.neighborhood, company.city, company.state && `/${company.state}`, company.zipCode && `CEP: ${company.zipCode}`]
                            .filter(Boolean)
                            .join(' ')}
                        </p>
                        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: isMobile ? '1.5rem' : '3rem', paddingRight: isMobile ? '0' : '3rem' }}>
                  <button
                    onClick={handleLogout}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: isMobile ? '0.875rem' : '1rem', color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer', outline: 'none' }}
                  >
                    <DoorOpen size={isMobile ? 16 : 20} />
                    Sair
                  </button>
                </div>

              </div>

              {/* Botão fechar — fixo no fundo da tela */}
              <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 60 }}>
                <button
                  onClick={() => { setExpanded(false); setEditing(false); setAvatarMenuOpen(false) }}
                  style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', outline: 'none' }}
                >
                  <CaretUp size={20} color="white" weight="bold" />
                </button>
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        title="Alterar Senha"
      >
        <form onSubmit={handleChangePassword} className="flex flex-col gap-5" style={{ width: '100%' }}>
          <Input
            label="Senha atual"
            type="password"
            placeholder="Digite sua senha atual"
            value={currentPassword}
            onChange={(e) => { setCurrentPassword(e.target.value); setPasswordErrors((p) => ({ ...p, currentPassword: undefined })) }}
            error={passwordErrors.currentPassword}
          />
          <Input
            label="Nova senha"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setPasswordErrors((p) => ({ ...p, newPassword: undefined })) }}
            error={passwordErrors.newPassword}
          />
          <Input
            label="Confirmar nova senha"
            type="password"
            placeholder="Repita a nova senha"
            value={confirmNewPassword}
            onChange={(e) => { setConfirmNewPassword(e.target.value); setPasswordErrors((p) => ({ ...p, confirmNewPassword: undefined })) }}
            error={passwordErrors.confirmNewPassword}
          />
          <div className="flex items-center justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={() => setPasswordModalOpen(false)}
              className="px-6 py-2.5 text-white/70 hover:text-white transition-colors rounded-[10px] hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingPassword}
              className="bg-app-secondary text-app-primary font-medium rounded-[10px] hover:brightness-110 transition disabled:opacity-50"
              style={{ padding: '0.375rem 1rem' }}
            >
              {savingPassword ? 'Alterando...' : 'Alterar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
