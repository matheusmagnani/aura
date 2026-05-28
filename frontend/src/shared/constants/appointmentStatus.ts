export const APPOINTMENT_STATUS_LABELS: Record<number, string> = {
  1: 'Pendente',
  2: 'Concluído',
  3: 'Cancelado',
}

export const APPOINTMENT_STATUS_COLORS: Record<number, string> = {
  1: '#E6C284',
  2: '#4ade80',
  3: '#f87171',
}

export const APPOINTMENT_STATUS_ORDER = [1, 2, 3]

export const APPOINTMENT_STATUS_OPTIONS = APPOINTMENT_STATUS_ORDER.map(id => ({
  value: id,
  label: APPOINTMENT_STATUS_LABELS[id],
  color: APPOINTMENT_STATUS_COLORS[id],
}))
