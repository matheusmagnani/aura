import { useState, useEffect, useCallback } from 'react'
import { Buildings, PencilSimple, FloppyDisk, X, CircleNotch } from '@phosphor-icons/react'
import { Input } from '../../../shared/components/ui/Input'
import { Select } from '../../../shared/components/ui/Select'
import { SettingsSection } from './SettingsSection'
import { useCompanyInfo, useUpdateCompanyInfo } from '../hooks/useSettings'
import { useToast } from '../../../shared/hooks/useToast'
import { useCepSearch } from '../../../shared/hooks/useCepSearch'

interface FormData {
  name: string
  tradeName: string
  cnpj: string
  department: string
  email: string
  phone: string
  address: string
  addressNumber: string
  addressComplement: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
}

const DEPARTMENTS = ['Tecnologia', 'Marketing', 'Financeiro', 'Recursos Humanos', 'Comercial', 'Jurídico', 'Operações', 'Logística', 'Outros']

const initialFormData: FormData = {
  name: '', tradeName: '', cnpj: '', department: '',
  email: '', phone: '', address: '', addressNumber: '',
  addressComplement: '', neighborhood: '', city: '', state: '', zipCode: '',
}

function formatCNPJ(value: string) {
  const c = value.replace(/\D/g, '').slice(0, 14)
  return c.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function formatPhone(value: string) {
  const c = value.replace(/\D/g, '').slice(0, 11)
  if (c.length <= 10) return c.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return c.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

function formatZipCode(value: string) {
  const c = value.replace(/\D/g, '').slice(0, 8)
  return c.replace(/(\d{5})(\d)/, '$1-$2')
}

export function CompanyInfoSection({ isExpanded: isExpandedProp, onToggle: onToggleProp }: { isExpanded?: boolean; onToggle?: () => void } = {}) {
  const [isExpandedInternal, setIsExpandedInternal] = useState(false)
  const isExpanded = isExpandedProp !== undefined ? isExpandedProp : isExpandedInternal
  const handleToggle = onToggleProp ?? (() => setIsExpandedInternal(v => !v))
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<Partial<FormData>>({})

  const { data: companyInfo, isLoading } = useCompanyInfo()
  const updateCompanyInfo = useUpdateCompanyInfo()
  const { addToast } = useToast()
  const { fetchAddress, isLoading: isLoadingCep } = useCepSearch()

  const fetchAddressByCep = useCallback(async (cep: string) => {
    const result = await fetchAddress(cep)
    if (!result) { addToast('CEP não encontrado', 'warning'); return }
    setFormData(prev => ({
      ...prev,
      address: result.street || prev.address,
      neighborhood: result.neighborhood || prev.neighborhood,
      city: result.city || prev.city,
      state: result.state || prev.state,
    }))
    setErrors(prev => ({ ...prev, address: undefined, neighborhood: undefined, city: undefined, state: undefined }))
  }, [fetchAddress, addToast])

  useEffect(() => {
    if (companyInfo) {
      setFormData({
        name: companyInfo.name || '',
        tradeName: companyInfo.tradeName || '',
        cnpj: formatCNPJ(companyInfo.cnpj || ''),
        department: companyInfo.department || '',
        email: companyInfo.email || '',
        phone: formatPhone(companyInfo.phone || ''),
        address: companyInfo.address || '',
        addressNumber: companyInfo.addressNumber || '',
        addressComplement: companyInfo.addressComplement || '',
        neighborhood: companyInfo.neighborhood || '',
        city: companyInfo.city || '',
        state: companyInfo.state || '',
        zipCode: formatZipCode(companyInfo.zipCode || ''),
      })
    }
  }, [companyInfo])

  const handleChange = (field: keyof FormData, value: string) => {
    let v = value
    if (field === 'cnpj') v = formatCNPJ(value)
    else if (field === 'phone') v = formatPhone(value)
    else if (field === 'zipCode') {
      v = formatZipCode(value)
      const clean = value.replace(/\D/g, '')
      if (clean.length === 8) fetchAddressByCep(clean)
    } else if (field === 'state') v = value.toUpperCase().slice(0, 2)
    setFormData(prev => ({ ...prev, [field]: v }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const validate = (): boolean => {
    const errs: Partial<FormData> = {}
    if (!formData.name.trim()) errs.name = 'Razão social é obrigatória'
    else if (formData.name.trim().length < 3) errs.name = 'Mínimo 3 caracteres'
    if (!formData.tradeName.trim()) errs.tradeName = 'Nome fantasia é obrigatório'
    const cnpjClean = formData.cnpj.replace(/\D/g, '')
    if (!cnpjClean) errs.cnpj = 'CNPJ é obrigatório'
    else if (cnpjClean.length !== 14) errs.cnpj = 'CNPJ deve ter 14 dígitos'
    if (!formData.department.trim()) errs.department = 'Departamento é obrigatório'
    if (!formData.email.trim()) errs.email = 'E-mail é obrigatório'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'E-mail inválido'
    const phoneClean = formData.phone.replace(/\D/g, '')
    if (!phoneClean) errs.phone = 'Telefone é obrigatório'
    else if (phoneClean.length < 10 || phoneClean.length > 11) errs.phone = 'Telefone deve ter 10 ou 11 dígitos'
    const zipClean = formData.zipCode.replace(/\D/g, '')
    if (!zipClean) errs.zipCode = 'CEP é obrigatório'
    else if (zipClean.length !== 8) errs.zipCode = 'CEP deve ter 8 dígitos'
    if (!formData.address.trim()) errs.address = 'Endereço é obrigatório'
    if (!formData.addressNumber.trim()) errs.addressNumber = 'Número é obrigatório'
    if (!formData.neighborhood.trim()) errs.neighborhood = 'Bairro é obrigatório'
    if (!formData.city.trim()) errs.city = 'Cidade é obrigatória'
    if (!formData.state.trim()) errs.state = 'UF é obrigatória'
    else if (formData.state.length !== 2) errs.state = 'UF deve ter 2 caracteres'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    try {
      await updateCompanyInfo.mutateAsync({
        companyName: formData.name,
        tradeName: formData.tradeName,
        cnpj: formData.cnpj,
        department: formData.department,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        addressNumber: formData.addressNumber,
        addressComplement: formData.addressComplement,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
      })
      addToast('Informações da empresa atualizadas!', 'success')
      setIsEditing(false)
    } catch {
      addToast('Erro ao atualizar informações da empresa', 'danger')
    }
  }

  const handleCancel = () => {
    if (companyInfo) {
      setFormData({
        name: companyInfo.name || '',
        tradeName: companyInfo.tradeName || '',
        cnpj: formatCNPJ(companyInfo.cnpj || ''),
        department: companyInfo.department || '',
        email: companyInfo.email || '',
        phone: formatPhone(companyInfo.phone || ''),
        address: companyInfo.address || '',
        addressNumber: companyInfo.addressNumber || '',
        addressComplement: companyInfo.addressComplement || '',
        neighborhood: companyInfo.neighborhood || '',
        city: companyInfo.city || '',
        state: companyInfo.state || '',
        zipCode: formatZipCode(companyInfo.zipCode || ''),
      })
    }
    setErrors({})
    setIsEditing(false)
  }

  const btnStyle = {
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
    borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
  }

  if (isLoading) {
    return (
      <SettingsSection
        title="Informações da Empresa"
        description="Dados cadastrais da empresa"
        icon={<Buildings size={20} weight="fill" />}
        isExpanded={isExpanded}
        onToggle={handleToggle}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <div style={{ width: 32, height: 32, border: '2px solid rgba(106,166,193,0.3)', borderTopColor: 'var(--color-app-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </SettingsSection>
    )
  }

  return (
    <SettingsSection
      title="Informações da Empresa"
      description="Dados cadastrais da empresa"
      icon={<Buildings size={20} weight="fill" />}
      isExpanded={isExpanded}
      onToggle={handleToggle}
      actions={
        <div className="settings-actions">
          {isEditing && !updateCompanyInfo.isPending && (
            <button
              onClick={handleCancel}
              style={{ ...btnStyle, background: 'none', color: 'rgba(255,255,255,0.5)' }}
            >
              <X size={16} weight="bold" />
              Cancelar
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (isEditing) handleSave()
              else { if (!isExpanded) handleToggle(); setIsEditing(true) }
            }}
            disabled={updateCompanyInfo.isPending}
            style={{ ...btnStyle, background: 'none', color: 'var(--color-app-accent)', opacity: updateCompanyInfo.isPending ? 0.5 : 1 }}
          >
            {isEditing ? (
              <><FloppyDisk size={16} weight="bold" />{updateCompanyInfo.isPending ? 'Salvando...' : 'Salvar'}</>
            ) : (
              <><PencilSimple size={16} weight="bold" />Editar</>
            )}
          </button>
        </div>
      }
    >
      <div className="settings-form-grid">
        <Input
          label="Razão Social"
          placeholder="Nome da empresa"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={errors.name}
          disabled={!isEditing}
        />
        <Input
          label="Nome Fantasia"
          placeholder="Nome fantasia"
          value={formData.tradeName}
          onChange={(e) => handleChange('tradeName', e.target.value)}
          error={errors.tradeName}
          disabled={!isEditing}
        />
        <Input
          label="CNPJ"
          placeholder="00.000.000/0000-00"
          value={formData.cnpj}
          onChange={(e) => handleChange('cnpj', e.target.value)}
          error={errors.cnpj}
          disabled={!isEditing}
        />
        <Select
          label="Departamento"
          value={formData.department}
          onChange={(v) => handleChange('department', v)}
          options={DEPARTMENTS.map(d => ({ value: d, label: d }))}
          error={errors.department}
          disabled={!isEditing}
        />
        <Input
          label="E-mail"
          type="email"
          placeholder="contato@empresa.com"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          disabled={!isEditing}
        />
        <Input
          label="Telefone"
          placeholder="(00) 00000-0000"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          error={errors.phone}
          disabled={!isEditing}
        />

        <div style={{ position: 'relative' }}>
          <Input
            label="CEP"
            placeholder="00000-000"
            value={formData.zipCode}
            onChange={(e) => handleChange('zipCode', e.target.value)}
            error={errors.zipCode}
            disabled={!isEditing || isLoadingCep}
          />
          {isLoadingCep && (
            <div style={{ position: 'absolute', right: 12, top: 36 }}>
              <CircleNotch size={18} style={{ color: 'var(--color-app-accent)', animation: 'spin 0.8s linear infinite' }} weight="bold" />
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
          <Input
            label="Endereço"
            placeholder="Rua, Avenida..."
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            error={errors.address}
            disabled={!isEditing}
          />
          <Input
            label="Número"
            placeholder="123"
            value={formData.addressNumber}
            onChange={(e) => handleChange('addressNumber', e.target.value)}
            error={errors.addressNumber}
            disabled={!isEditing}
          />
        </div>

        <Input
          label="Bairro"
          placeholder="Bairro"
          value={formData.neighborhood}
          onChange={(e) => handleChange('neighborhood', e.target.value)}
          error={errors.neighborhood}
          disabled={!isEditing}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
          <Input
            label="Cidade"
            placeholder="Cidade"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            error={errors.city}
            disabled={!isEditing}
          />
          <Input
            label="UF"
            placeholder="UF"
            value={formData.state}
            onChange={(e) => handleChange('state', e.target.value)}
            error={errors.state}
            disabled={!isEditing}
          />
        </div>

        <Input
          label="Complemento"
          placeholder="Apto, Sala, Bloco... (opcional)"
          value={formData.addressComplement}
          onChange={(e) => handleChange('addressComplement', e.target.value)}
          disabled={!isEditing}
        />
      </div>
    </SettingsSection>
  )
}
