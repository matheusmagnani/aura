import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Plus, type Icon } from '@phosphor-icons/react'
import { SearchInput } from './ui/SearchInput'

export interface FilterOption {
  label: string
  value: number | undefined
}

interface PageHeaderProps {
  title: string
  icon?: Icon
  searchPlaceholder?: string
  filterOptions?: FilterOption[]
  filterValue?: number | undefined
  filterContent?: ReactNode
  filterActive?: boolean
  onFilterToggle?: () => void
  searchValue?: string
  onSearch?: (value: string) => void
  onFilterChange?: (value: number | undefined) => void
  canCreate?: boolean
  onAdd?: () => void
  actions?: ReactNode
}

export function PageHeader({
  title,
  icon: IconComponent,
  searchPlaceholder = 'Buscar...',
  filterOptions,
  filterValue,
  filterContent,
  filterActive,
  onFilterToggle,
  searchValue,
  onSearch,
  onFilterChange,
  canCreate,
  onAdd,
  actions,
}: PageHeaderProps) {
  const filterRef = useRef<HTMLDivElement>(null)
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const hasFilter = !!(filterOptions || filterContent || onFilterToggle)

  function handleFilterClick() {
    if (onFilterToggle) {
      onFilterToggle()
    } else {
      setShowFilterMenu(v => !v)
    }
  }

  return (
    <div className="page-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {IconComponent && (
          <span className="desktop-table">
            <IconComponent size={28} className="text-app-secondary" weight="regular" />
          </span>
        )}
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>{title}</h1>
      </div>

      <div className="page-header-actions">
        {onSearch && (
          <div ref={filterRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <SearchInput
              placeholder={searchPlaceholder}
              initialValue={searchValue}
              onSearch={onSearch}
              onFilter={hasFilter ? handleFilterClick : undefined}
              filterActive={filterActive}
            />
            {showFilterMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '110%', zIndex: 50,
                background: 'var(--color-app-primary)',
                border: '1px solid rgba(230,194,132,0.2)',
                borderRadius: 10, minWidth: 180,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)', overflow: 'hidden',
              }}>
                {filterContent ? (
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filterContent}
                  </div>
                ) : filterOptions?.map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => {
                      onFilterChange?.(opt.value)
                      setShowFilterMenu(false)
                    }}
                    style={{
                      width: '100%', padding: '10px 16px',
                      background: filterValue === opt.value ? 'rgba(230,194,132,0.1)' : 'none',
                      border: 'none', cursor: 'pointer',
                      color: filterValue === opt.value ? 'var(--color-app-secondary)' : 'rgba(255,255,255,0.8)',
                      textAlign: 'left', fontSize: 13,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {actions}

        {canCreate && onAdd && (
          <button
            onClick={onAdd}
            style={{
              background: 'var(--color-app-accent)', border: 'none', borderRadius: 8,
              width: 32, height: 32, color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <Plus size={18} weight="bold" />
          </button>
        )}
      </div>
    </div>
  )
}
