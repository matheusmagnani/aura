import { useState, useRef } from 'react'
import { MagnifyingGlass, Funnel, X } from '@phosphor-icons/react'

interface SearchInputProps {
  placeholder?: string
  initialValue?: string
  onSearch?: (value: string) => void
  onFilter?: () => void
  filterActive?: boolean
}

export function SearchInput({
  placeholder = 'Buscar...',
  initialValue = '',
  onSearch,
  onFilter,
  filterActive,
}: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [searchValue, setSearchValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  const expanded = isFocused || !!searchValue

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchValue(value)
    onSearch?.(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchValue) onSearch?.(searchValue)
    if (e.key === 'Escape') {
      setSearchValue('')
      onSearch?.('')
      inputRef.current?.blur()
    }
  }

  function handleClear() {
    setSearchValue('')
    onSearch?.('')
    inputRef.current?.focus()
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, width: '100%' }}>
      <button
        onClick={() => inputRef.current?.focus()}
        style={{ flexShrink: 0, transition: 'transform 300ms', display: 'flex' }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <MagnifyingGlass className="w-6 md:w-[26px] h-6 md:h-[26px] text-white" weight="regular" />
      </button>

      <div style={{ position: 'relative', width: expanded ? '100%' : 80, transition: 'width 800ms cubic-bezier(0.4,0,0.2,1)' }}>
        <input
          ref={inputRef}
          type="text"
          value={searchValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder=""
          style={{
            background: 'transparent',
            color: '#fff',
            outline: 'none',
            fontSize: '1rem',
            border: '1px solid',
            borderRadius: 8,
            padding: searchValue ? '4px 28px 4px 12px' : '4px 12px',
            width: '100%',
            borderColor: expanded ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.5)',
            transition: 'border-color 300ms',
          }}
        />
        {searchValue && (
          <button
            onMouseDown={(e) => { e.preventDefault(); handleClear() }}
            style={{
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', padding: 2,
            }}
          >
            <X size={14} weight="bold" />
          </button>
        )}
      </div>

      {onFilter && (
        <button
          onClick={onFilter}
          style={{ flexShrink: 0, transition: 'transform 300ms', display: 'flex', position: 'relative' }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Funnel
            className="w-6 md:w-[26px] h-6 md:h-[26px]"
            weight={filterActive ? 'fill' : 'regular'}
            style={{ color: filterActive ? 'var(--color-app-secondary)' : 'white' }}
          />
          {filterActive && (
            <span style={{
              position: 'absolute', top: -2, right: -2,
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--color-app-secondary)',
            }} />
          )}
        </button>
      )}
    </div>
  )
}
