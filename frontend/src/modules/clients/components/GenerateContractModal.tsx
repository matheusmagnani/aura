import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CaretLeft, CaretRight, CurrencyCircleDollar, UserCircle } from '@phosphor-icons/react'
import { Modal } from '../../../shared/components/Modal'
import { FullScreenLoading } from '../../../shared/components/FullScreenLoading'
import { ContractPreview } from '../../../shared/components/contract-studio/ContractPreview'
import { proposalService, type Proposal } from '../../../shared/services/proposalService'
import { contractTemplateService } from '../../../shared/services/contractTemplateService'
import { formatCurrency } from '../../../shared/utils/formatters'
import { PROPOSAL_COLORS, PROPOSAL_LABELS } from '../../../shared/constants/proposalStatus'
import { useToast } from '../../../shared/hooks/useToast'
import { getApiError } from '../../../shared/utils/getApiError'

interface GenerateContractModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: number
  clientName: string
  onConfirm: (proposalId: number, templateId: number) => Promise<void>
  initialProposalId?: number
}

export function GenerateContractModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  onConfirm,
  initialProposalId,
}: GenerateContractModalProps) {
  const [step, setStep] = useState<1 | 2>(initialProposalId ? 2 : 1)
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(initialProposalId ?? null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [templatePage, setTemplatePage] = useState(0)
  const { addToast } = useToast()

  const { data: proposalsData } = useQuery({
    queryKey: ['client-proposals-accepted', clientId],
    queryFn: async () => {
      const res = await proposalService.list({ clientId, statuses: [3] })
      return res.data
    },
    enabled: isOpen,
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['contract-templates'],
    queryFn: contractTemplateService.list,
    enabled: isOpen && step === 2,
  })

  const acceptedProposals = proposalsData ?? []

  function handleClose() {
    setStep(initialProposalId ? 2 : 1)
    setSelectedProposalId(initialProposalId ?? null)
    setSelectedTemplateId(null)
    onClose()
  }

  function goToStep2() {
    if (!selectedProposalId) return
    setStep(2)
  }

  async function handleConfirm() {
    if (!selectedProposalId || !selectedTemplateId) return
    setLoading(true)
    try {
      await onConfirm(selectedProposalId, selectedTemplateId)
      handleClose()
    } catch (err: any) {
      addToast(getApiError(err), 'danger')
    } finally {
      setLoading(false)
    }
  }

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {step === 2 && !initialProposalId && (
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-app-accent)', display: 'flex', padding: 0 }}
            >
              <CaretLeft size={18} weight="bold" />
            </button>
          )}
          {step === 1 ? 'Escolher Proposta' : 'Escolher Modelo'}
        </span>
      }
      className="max-w-lg"
    >
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Propostas aceitas de <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{clientName}</strong>:
          </p>

          {acceptedProposals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(106,166,193,0.5)', fontSize: 14 }}>
              Nenhuma proposta com status "Aceita" encontrada.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
              {acceptedProposals.map((p: Proposal) => {
                const color = PROPOSAL_COLORS[p.idStatus] ?? '#8A919C'
                const label = PROPOSAL_LABELS[p.idStatus] ?? String(p.idStatus)
                const selected = selectedProposalId === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProposalId(p.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                      border: `1px solid ${selected ? 'rgba(106,166,193,0.45)' : 'rgba(106,166,193,0.15)'}`,
                      background: selected ? 'rgba(106,166,193,0.1)' : 'rgba(255,255,255,0.03)',
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!selected) {
                        e.currentTarget.style.background = 'rgba(106,166,193,0.07)'
                        e.currentTarget.style.borderColor = 'rgba(106,166,193,0.3)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!selected) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                        e.currentTarget.style.borderColor = 'rgba(106,166,193,0.15)'
                      }
                    }}
                  >
                    {/* Left: value + collaborator */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <CurrencyCircleDollar size={11} style={{ color: 'var(--color-app-secondary)', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-app-secondary)' }}>
                          {formatCurrency(Number(p.value))}
                        </span>
                      </div>
                      {p.collaborator && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                          <UserCircle size={10} />
                          <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {p.collaborator.name}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Right: status badge + date */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        fontSize: 10, fontWeight: 500, color,
                        background: `${color}22`, border: `1px solid ${color}44`,
                        borderRadius: 999, padding: '1px 6px',
                      }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        {label}
                      </span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
                        {new Date(p.statusChangedAt ?? p.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={handleClose} style={{ padding: '8px 20px', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 14 }}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={goToStep2}
              disabled={!selectedProposalId}
              style={{ padding: '8px 20px', background: 'var(--color-app-secondary)', border: 'none', borderRadius: 10, color: 'var(--color-app-primary)', fontWeight: 600, cursor: !selectedProposalId ? 'not-allowed' : 'pointer', fontSize: 14, opacity: !selectedProposalId ? 0.5 : 1 }}
            >
              Próximo
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Escolha o modelo de contrato:
          </p>

          {templates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(106,166,193,0.5)', fontSize: 14 }}>
              Nenhum modelo cadastrado. Crie um em Configurações → Modelos de Contrato.
            </div>
          ) : (
            <>
              {/* Mobile — carousel 1 por página */}
              <div className="md:hidden">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button
                      type="button"
                      onClick={() => setTemplatePage(p => Math.max(0, p - 1))}
                      disabled={templatePage === 0}
                      style={{ background: 'none', border: 'none', cursor: templatePage === 0 ? 'default' : 'pointer', padding: 4, color: '#fff', opacity: templatePage === 0 ? 0.15 : 0.45, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                    >
                      <CaretLeft size={20} weight="bold" />
                    </button>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', transform: `translateX(-${templatePage * 100}%)`, transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
                        {templates.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedTemplateId(t.id)}
                            style={{
                              minWidth: '100%', borderRadius: 10, border: 'none', cursor: 'pointer', padding: '10px 8px 8px',
                              background: selectedTemplateId === t.id ? 'rgba(106,166,193,0.12)' : 'rgba(255,255,255,0.02)',
                              outline: selectedTemplateId === t.id ? '1.5px solid rgba(106,166,193,0.5)' : '1px solid rgba(106,166,193,0.15)',
                              transition: 'background 0.15s', textAlign: 'center',
                            }}
                          >
                            <ContractPreview content={t.content} />
                            <p style={{ fontSize: 12, fontWeight: 600, color: selectedTemplateId === t.id ? 'var(--color-app-accent)' : 'rgba(255,255,255,0.7)', margin: '6px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.name}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTemplatePage(p => Math.min(templates.length - 1, p + 1))}
                      disabled={templatePage === templates.length - 1}
                      style={{ background: 'none', border: 'none', cursor: templatePage === templates.length - 1 ? 'default' : 'pointer', padding: 4, color: '#fff', opacity: templatePage === templates.length - 1 ? 0.15 : 0.45, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                    >
                      <CaretRight size={20} weight="bold" />
                    </button>
                  </div>
                  {templates.length > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                      {templates.map((_, i) => (
                        <button key={i} type="button" onClick={() => setTemplatePage(i)} style={{ width: i === templatePage ? 16 : 6, height: 6, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer', background: i === templatePage ? 'var(--color-app-accent)' : 'rgba(255,255,255,0.2)', transition: 'width 0.2s, background 0.2s' }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop — grid */}
              <div className="hidden md:grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(t.id)}
                    style={{
                      borderRadius: 10, border: 'none', cursor: 'pointer', padding: '10px 8px 8px',
                      background: selectedTemplateId === t.id ? 'rgba(106,166,193,0.12)' : 'rgba(255,255,255,0.02)',
                      outline: selectedTemplateId === t.id ? '1.5px solid rgba(106,166,193,0.5)' : '1px solid rgba(106,166,193,0.15)',
                      transition: 'background 0.15s', textAlign: 'center',
                    }}
                  >
                    <ContractPreview content={t.content} />
                    <p style={{ fontSize: 12, fontWeight: 600, color: selectedTemplateId === t.id ? 'var(--color-app-accent)' : 'rgba(255,255,255,0.7)', margin: '6px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.name}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}

          {selectedTemplate && (
            <p style={{ fontSize: 12, color: 'rgba(106,166,193,0.7)', margin: 0 }}>
              Modelo selecionado: <strong>{selectedTemplate.name}</strong>
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={handleClose} style={{ padding: '8px 20px', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 14 }}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedTemplateId || loading}
              style={{ padding: '8px 20px', background: 'var(--color-app-secondary)', border: 'none', borderRadius: 10, color: 'var(--color-app-primary)', fontWeight: 600, cursor: !selectedTemplateId || loading ? 'not-allowed' : 'pointer', fontSize: 14, opacity: !selectedTemplateId || loading ? 0.5 : 1 }}
            >
              {loading ? 'Gerando...' : 'Gerar Contrato'}
            </button>
          </div>
        </div>
      )}
    </Modal>

      <FullScreenLoading visible={loading} label="Gerando contrato..." />
    </>
  )
}
