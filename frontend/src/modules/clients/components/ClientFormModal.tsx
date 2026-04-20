import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../../shared/components/Modal'
import { Input } from '../../../shared/components/ui/Input'
import { Select } from '../../../shared/components/ui/Select'
import { clientService, type Client } from '../../../shared/services/clientService'
import { collaboratorsService } from '../../../shared/services/collaboratorsService'
import { clientStatusService } from '../../../shared/services/clientStatusService'
import { useToast } from '../../../shared/hooks/useToast'
import { useCepSearch } from '../../../shared/hooks/useCepSearch'
import { formatPhone, formatZipCode, formatCPF, formatCNPJ } from '../../../shared/utils/formatters'
import { validateCPF, validateCNPJ } from '../../../shared/utils/validateDocuments'

const STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
].map(s => ({ value: s, label: s }))

interface FormData {
  name: string
  email: string
  phone: string
  document: string
  documentType: 'CPF' | 'CNPJ'
  zipCode: string
  address: string
  addressNumber: string
  addressComplement: string
  neighborhood: string
  city: string
  state: string
  userId: string
  statusId: string
}

interface ClientFormModalProps {
  client?: Client
  onClose: () => void
  onSaved: () => void
}

export function ClientFormModal({ client, onClose, onSaved }: ClientFormModalProps) {
  const { addToast } = useToast()
  const { fetchAddress, isLoading: isLoadingCep } = useCepSearch()
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  const { data: collaboratorsData } = useQuery({
    queryKey: ['collaborators-select'],
    queryFn: () => collaboratorsService.list({ limit: 200, active: 1 }),
  })

  const { data: statusesData = [] } = useQuery({
    queryKey: ['client-statuses'],
    queryFn: clientStatusService.list,
    staleTime: 1000 * 60 * 5,
  })

  const statusOptions = [
    { value: '', label: 'Sem status' },
    ...statusesData.map(s => ({ value: String(s.id), label: s.name })),
  ]

  const collaboratorOptions = [
    { value: '', label: 'Nenhum' },
    ...(collaboratorsData?.data ?? []).map(c => ({
      value: String(c.id),
      label: c.role ? `${c.name} — ${c.role.name}` : c.name,
    })),
  ]

  const [form, setForm] = useState<FormData>({
    name: client?.name ?? '',
    email: client?.email ?? '',
    phone: formatPhone(client?.phone ?? ''),
    document: client?.document
      ? (client.documentType === 'CNPJ' ? formatCNPJ(client.document) : formatCPF(client.document))
      : '',
    documentType: (client?.documentType as 'CPF' | 'CNPJ') ?? 'CPF',
    zipCode: formatZipCode(client?.zipCode ?? ''),
    address: client?.address ?? '',
    addressNumber: client?.addressNumber ?? '',
    addressComplement: client?.addressComplement ?? '',
    neighborhood: client?.neighborhood ?? '',
    city: client?.city ?? '',
    state: client?.state ?? '',
    userId: client?.userId != null ? String(client.userId) : '',
    statusId: client?.statusId != null ? String(client.statusId) : '',
  })

  function toggleDocumentType() {
    const newType = form.documentType === 'CPF' ? 'CNPJ' : 'CPF'
    setForm(prev => ({ ...prev, documentType: newType, document: '' }))
    setErrors(prev => ({ ...prev, document: undefined }))
  }

  const handleChange = useCallback(async (field: keyof FormData, value: string) => {
    let v = value
    if (field === 'document') {
      v = form.documentType === 'CPF' ? formatCPF(value) : formatCNPJ(value)
    } else if (field === 'phone') {
      v = formatPhone(value)
    } else if (field === 'zipCode') {
      v = formatZipCode(value)
      const clean = value.replace(/\D/g, '')
      if (clean.length === 8) {
        const result = await fetchAddress(clean)
        if (!result) addToast('CEP não encontrado', 'warning')
        else {
          setForm(prev => ({
            ...prev,
            address: result.street || prev.address,
            neighborhood: result.neighborhood || prev.neighborhood,
            city: result.city || prev.city,
            state: result.state || prev.state,
          }))
        }
      }
    }
    setForm(prev => ({ ...prev, [field]: v }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }, [fetchAddress, addToast, form.documentType])

  function validate(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {}
    if (!form.name.trim()) errs.name = 'Nome é obrigatório'
    const phoneClean = form.phone.replace(/\D/g, '')
    if (!phoneClean) errs.phone = 'Telefone é obrigatório'
    else if (phoneClean.length < 10 || phoneClean.length > 11) errs.phone = 'Telefone deve ter 10 ou 11 dígitos'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'E-mail inválido'
    if (form.document) {
      if (form.documentType === 'CPF' && !validateCPF(form.document)) errs.document = 'CPF inválido'
      if (form.documentType === 'CNPJ' && !validateCNPJ(form.document)) errs.document = 'CNPJ inválido'
    }
    const zipClean = form.zipCode.replace(/\D/g, '')
    if (form.zipCode && zipClean.length !== 8) errs.zipCode = 'CEP deve ter 8 dígitos'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) {
      addToast('Preencha os campos obrigatórios corretamente.', 'danger')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        phone: form.phone.replace(/\D/g, ''),
        email: form.email || null,
        document: form.document ? form.document.replace(/\D/g, '') : null,
        documentType: form.document ? form.documentType : null,
        zipCode: form.zipCode ? form.zipCode.replace(/\D/g, '') : null,
        address: form.address || null,
        addressNumber: form.addressNumber || null,
        addressComplement: form.addressComplement || null,
        neighborhood: form.neighborhood || null,
        city: form.city || null,
        state: form.state || null,
        userId: form.userId ? Number(form.userId) : null,
        statusId: form.statusId ? Number(form.statusId) : null,
      }
      if (client) await clientService.update(client.id, payload)
      else await clientService.create(payload)
      addToast(client ? 'Cliente atualizado!' : 'Cliente criado!', 'success')
      onSaved()
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Erro ao salvar cliente', 'danger')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={client ? 'Editar Cliente' : 'Novo Cliente'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
        <Input
          label="Nome *"
          value={form.name}
          onChange={e => handleChange('name', e.target.value)}
          onClear={() => handleChange('name', '')}
          placeholder="Nome do cliente"
          error={errors.name}
        />

        <Input
          label="Telefone *"
          type="tel"
          value={form.phone}
          onChange={e => handleChange('phone', e.target.value)}
          onClear={() => handleChange('phone', '')}
          placeholder="(00) 00000-0000"
          error={errors.phone}
        />

        {/* Documento com toggle CPF/CNPJ no label */}
        <div className="flex flex-col gap-2">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="text-sm font-medium text-white">Documento</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
              {(['CPF', 'CNPJ'] as const).map((type, i) => (
                <span key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {i > 0 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>|</span>}
                  <button
                    type="button"
                    onClick={() => { if (form.documentType !== type) toggleDocumentType() }}
                    style={{
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, transition: 'color 0.15s',
                      color: form.documentType === type ? 'var(--color-app-secondary)' : 'var(--color-app-gray)',
                    }}
                  >
                    {type}
                  </button>
                </span>
              ))}
            </div>
          </div>
          <Input
            value={form.document}
            onChange={e => handleChange('document', e.target.value)}
            onClear={() => handleChange('document', '')}
            placeholder={form.documentType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
            error={errors.document}
          />
        </div>

        <Input
          label="E-mail"
          type="email"
          value={form.email}
          onChange={e => handleChange('email', e.target.value)}
          onClear={() => handleChange('email', '')}
          placeholder="email@exemplo.com"
          error={errors.email}
        />

        <Select
          label="Status"
          value={form.statusId}
          onChange={v => setForm(prev => ({ ...prev, statusId: v }))}
          options={statusOptions}
          placeholder="Sem status"
        />

        <Select
          label="Colaborador responsável"
          value={form.userId}
          onChange={v => { setForm(prev => ({ ...prev, userId: v })); setErrors(prev => ({ ...prev, userId: undefined })) }}
          options={collaboratorOptions}
          placeholder="Selecione um colaborador"
        />

        <Input
          label="CEP"
          value={form.zipCode}
          onChange={e => handleChange('zipCode', e.target.value)}
          onClear={() => handleChange('zipCode', '')}
          placeholder="00000-000"
          disabled={isLoadingCep}
          error={errors.zipCode}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
          <Input
            label="Endereço"
            value={form.address}
            onChange={e => handleChange('address', e.target.value)}
            onClear={() => handleChange('address', '')}
            placeholder="Rua, Avenida..."
          />
          <Input
            label="Número"
            value={form.addressNumber}
            onChange={e => handleChange('addressNumber', e.target.value)}
            onClear={() => handleChange('addressNumber', '')}
            placeholder="123"
          />
        </div>

        <Input
          label="Bairro"
          value={form.neighborhood}
          onChange={e => handleChange('neighborhood', e.target.value)}
          onClear={() => handleChange('neighborhood', '')}
          placeholder="Bairro"
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
          <Input
            label="Cidade"
            value={form.city}
            onChange={e => handleChange('city', e.target.value)}
            onClear={() => handleChange('city', '')}
            placeholder="Cidade"
          />
          <Select
            label="UF"
            value={form.state}
            onChange={v => handleChange('state', v)}
            options={STATES}
            placeholder="UF"
          />
        </div>

        <Input
          label="Complemento"
          value={form.addressComplement}
          onChange={e => handleChange('addressComplement', e.target.value)}
          onClear={() => handleChange('addressComplement', '')}
          placeholder="Apto, Sala, Bloco... (opcional)"
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px 20px', background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 14 }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{ padding: '0.375rem 1rem', background: 'var(--color-app-secondary)', border: 'none', borderRadius: 10, color: 'var(--color-app-primary)', fontWeight: 600, cursor: 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
