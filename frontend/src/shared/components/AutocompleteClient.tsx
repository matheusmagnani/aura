import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { clientService } from '../services/clientService'

interface AutocompleteClientProps {
  label?: string
  value: string
  onChange: (id: string, name: string) => void
  placeholder?: string
  initialName?: string
  error?: string
  filterUserId?: number
}

export function AutocompleteClient({ label, value, onChange, placeholder = 'Buscar cliente...', initialName, error, filterUserId }: AutocompleteClientProps) {
  const [inputValue, setInputValue] = useState(initialName ?? '')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const { data, isFetching } = useQuery({
    queryKey: ['clients-autocomplete', search, filterUserId],
    queryFn: () => clientService.select(search, filterUserId),
    enabled: search.length >= 1,
    staleTime: 1000 * 30,
  })

  function updateDropdownPos() {
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return
    const vv = window.visualViewport
    const vtop = vv?.offsetTop ?? 0
    const vleft = vv?.offsetLeft ?? 0
    setDropdownPos({ top: rect.bottom + vtop + 4, left: rect.left + vleft, width: rect.width })
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      const insideWrapper = wrapperRef.current?.contains(target)
      const insideDropdown = dropdownRef.current?.contains(target)
      if (!insideWrapper && !insideDropdown) {
        setOpen(false)
        if (!value) setInputValue('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [value])

  useEffect(() => {
    if (!open) return
    updateDropdownPos()
    window.addEventListener('scroll', updateDropdownPos, true)
    window.addEventListener('resize', updateDropdownPos)
    window.visualViewport?.addEventListener('resize', updateDropdownPos)
    window.visualViewport?.addEventListener('scroll', updateDropdownPos)
    return () => {
      window.removeEventListener('scroll', updateDropdownPos, true)
      window.removeEventListener('resize', updateDropdownPos)
      window.visualViewport?.removeEventListener('resize', updateDropdownPos)
      window.visualViewport?.removeEventListener('scroll', updateDropdownPos)
    }
  }, [open])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setInputValue(v)
    // Limpa seleção ao editar
    if (value) onChange('', '')
    clearTimeout(debounceRef.current)
    if (v.trim()) {
      debounceRef.current = setTimeout(() => {
        setSearch(v.trim())
        setOpen(true)
        updateDropdownPos()
      }, 250)
    } else {
      setSearch('')
      setOpen(false)
    }
  }, [value, onChange])

  function handleSelect(id: number, name: string) {
    onChange(String(id), name)
    setInputValue(name)
    setSearch('')
    setOpen(false)
  }

  function handleClear() {
    onChange('', '')
    setInputValue('')
    setSearch('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const options = data ?? []

  return (
    <div ref={wrapperRef} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 14, fontWeight: 500, color: 'white' }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.05)',
          border: error ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.2)',
          borderRadius: 12,
          padding: '8px 12px',
          transition: 'border-color 0.2s',
        }}
          onFocus={() => {}}
        >
          <MagnifyingGlass size={15} color="var(--color-app-gray)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => { if (search && options.length > 0) { setOpen(true); updateDropdownPos() } }}
            placeholder={placeholder}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'white', fontSize: 14,
            }}
          />
          {(inputValue || value) && (
            <button
              type="button"
              onClick={handleClear}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-app-gray)', display: 'flex', padding: 0 }}
            >
              <X size={14} weight="bold" />
            </button>
          )}
        </div>

        {open && dropdownPos && createPortal(
          <div ref={dropdownRef} style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            zIndex: 9999,
            background: 'var(--color-app-primary)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            maxHeight: 220, overflowY: 'auto',
          }}>
            {isFetching && (
              <div style={{ padding: '10px 16px', fontSize: 13, color: 'var(--color-app-gray)' }}>
                Buscando...
              </div>
            )}
            {!isFetching && options.length === 0 && (
              <div style={{ padding: '10px 16px', fontSize: 13, color: 'var(--color-app-gray)' }}>
                Nenhum cliente encontrado
              </div>
            )}
            {!isFetching && options.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c.id, c.name)}
                style={{
                  width: '100%', padding: '10px 16px',
                  background: String(c.id) === value ? 'rgba(106,166,193,0.12)' : 'none',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', flexDirection: 'column', gap: 2,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = String(c.id) === value ? 'rgba(106,166,193,0.12)' : 'none')}
              >
                <span style={{ fontSize: 13, color: 'white', fontWeight: 500 }}>{c.name}</span>
                {c.phone && <span style={{ fontSize: 11, color: 'var(--color-app-gray)' }}>{c.phone}</span>}
              </button>
            ))}
          </div>,
          document.body,
        )}
      </div>
      {error && <span style={{ fontSize: 12, color: '#f87171' }}>{error}</span>}
    </div>
  )
}
