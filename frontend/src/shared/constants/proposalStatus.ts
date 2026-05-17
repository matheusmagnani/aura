export const PROPOSAL_STATUS_ORDER = ['accepted', 'pending', 'sent', 'refused'] as const

export const PROPOSAL_LABELS: Record<string, string> = {
  pending: 'Pendente',
  sent: 'Enviada',
  accepted: 'Aceita',
  refused: 'Recusada',
}

export const PROPOSAL_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  sent: '#6AA6C1',
  accepted: '#4ADE80',
  refused: '#F87171',
}
