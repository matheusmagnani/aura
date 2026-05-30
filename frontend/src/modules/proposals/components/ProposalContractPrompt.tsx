import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../../shared/components/Modal'
import { GenerateContractModal } from '../../clients/components/GenerateContractModal'
import { contractService } from '../../../shared/services/contractService'
import { useToast } from '../../../shared/hooks/useToast'
import { getApiError } from '../../../shared/utils/getApiError'
import { formatCurrency } from '../../../shared/utils/formatters'
import type { Proposal } from '../../../shared/services/proposalService'

interface ProposalContractPromptProps {
  proposal: Proposal | null
  onClose: () => void
}

export function ProposalContractPrompt({ proposal, onClose }: ProposalContractPromptProps) {
  const [generateOpen, setGenerateOpen] = useState(false)
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  function handleConfirmPrompt() {
    setGenerateOpen(true)
  }

  function handleCloseAll() {
    setGenerateOpen(false)
    onClose()
  }

  async function handleGenerateConfirm(proposalId: number, templateId: number) {
    if (!proposal) return
    await contractService.create({ templateId, clientId: proposal.clientId, proposalId })
    addToast('Contrato gerado com sucesso!', 'success')
    queryClient.invalidateQueries({ queryKey: ['client-contracts', proposal.clientId] })
    queryClient.invalidateQueries({ queryKey: ['client-contracts'] })
    handleCloseAll()
  }

  if (!proposal) return null

  return (
    <>
      <Modal
        isOpen={!generateOpen}
        onClose={onClose}
        title="Proposta Aceita"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            A proposta de{' '}
            <strong style={{ color: '#fff' }}>{proposal.client.name}</strong>
            {' '}no valor de{' '}
            <strong style={{ color: 'var(--color-app-secondary)' }}>{formatCurrency(Number(proposal.value))}</strong>
            {' '}foi marcada como aceita.
            <br />Deseja gerar um contrato para essa proposta agora?
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 14, borderRadius: 8 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              Agora não
            </button>
            <button
              type="button"
              onClick={handleConfirmPrompt}
              style={{ padding: '8px 20px', background: 'var(--color-app-secondary)', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'var(--color-app-primary)', fontSize: 14, fontWeight: 600 }}
            >
              Gerar Contrato
            </button>
          </div>
        </div>
      </Modal>

      <GenerateContractModal
        isOpen={generateOpen}
        onClose={handleCloseAll}
        clientId={proposal.clientId}
        clientName={proposal.client.name}
        initialProposalId={proposal.id}
        onConfirm={handleGenerateConfirm}
      />
    </>
  )
}
