interface PaginationProps {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
  itemLabel?: string
}

export function Pagination({ page, totalPages, total, onPageChange, itemLabel = 'registro' }: PaginationProps) {
  const itemLabelPlural = itemLabel === 'registro' ? 'registros'
    : itemLabel === 'cliente' ? 'clientes'
    : itemLabel === 'colaborador' ? 'colaboradores'
    : `${itemLabel}s`

  const safeTotalPages = Math.max(1, totalPages)
  const disablePrev = page <= 1
  const disableNext = page >= safeTotalPages

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingTop: 8, paddingBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={disablePrev}
            style={{
              padding: '7px 16px', borderRadius: 8,
              border: '1px solid rgba(106,166,193,0.25)',
              background: 'none', cursor: disablePrev ? 'not-allowed' : 'pointer',
              color: disablePrev ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)', fontSize: 13,
            }}
          >
            Anterior
          </button>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', minWidth: 60, textAlign: 'center' }}>
            {page} / {safeTotalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
            disabled={disableNext}
            style={{
              padding: '7px 16px', borderRadius: 8,
              border: '1px solid rgba(106,166,193,0.25)',
              background: 'none', cursor: disableNext ? 'not-allowed' : 'pointer',
              color: disableNext ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)', fontSize: 13,
            }}
          >
            Próximo
          </button>
      </div>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
        {total} {total === 1 ? itemLabel : itemLabelPlural}
      </span>
    </div>
  )
}
