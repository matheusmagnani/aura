import * as React from 'react'
import { createPortal } from 'react-dom'
import { CaretDown, Check } from '@phosphor-icons/react'
import { cn } from '../../utils/cn'

export interface SelectOption {
  value: string
  label: string
  badge?: string
}

interface SelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  error?: string
  disabled?: boolean
  variant?: 'default' | 'accent'
  dropdownAlign?: 'start' | 'center'
  className?: string
  typeahead?: boolean
}

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = 'Selecione',
  error,
  disabled,
  variant = 'default',
  dropdownAlign = 'start',
  className,
  typeahead = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({})
  const [typeaheadBuffer, setTypeaheadBuffer] = React.useState('')
  const typeaheadTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const wrapperRef = React.useRef<HTMLDivElement>(null)

  const isAccent = variant === 'accent'

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Element
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        !target.closest('[data-select-dropdown]')
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on scroll or resize to avoid stale positioning
  // but ignore scroll events that happen inside the dropdown list itself
  React.useEffect(() => {
    if (!isOpen) return
    function handleScroll(e: Event) {
      if ((e.target as Element)?.closest('[data-select-dropdown]')) return
      setIsOpen(false)
    }
    function handleResize() { setIsOpen(false) }
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen])

  // Typeahead: listen for keypresses while dropdown is open
  React.useEffect(() => {
    if (!isOpen || !typeahead) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key.length !== 1 || e.metaKey || e.ctrlKey) return

      setTypeaheadBuffer(prev => {
        const next = (prev + e.key).toUpperCase()

        if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current)
        typeaheadTimer.current = setTimeout(() => setTypeaheadBuffer(''), 800)

        const match = options.find(o => o.label.toUpperCase().startsWith(next))
        if (match) {
          const el = listRef.current?.querySelector<HTMLElement>(`[data-value="${match.value}"]`)
          el?.scrollIntoView({ block: 'nearest' })

          if (match.label.toUpperCase() === next) {
            onChange(match.value)
            setIsOpen(false)
            return ''
          }
        }

        return next
      })
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, typeahead, options, onChange])

  function toggleDropdown() {
    if (disabled) return
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropdownHeight = 220
      const openUp = spaceBelow < dropdownHeight + 8
      if (dropdownAlign === 'center') {
        const centerX = rect.left + rect.width / 2
        setDropdownStyle(openUp
          ? { position: 'fixed', bottom: window.innerHeight - rect.top + 6, left: centerX, transform: 'translateX(-50%)', minWidth: rect.width, zIndex: 9999 }
          : { position: 'fixed', top: rect.bottom + 6, left: centerX, transform: 'translateX(-50%)', minWidth: rect.width, zIndex: 9999 }
        )
      } else {
        setDropdownStyle(openUp
          ? { position: 'fixed', bottom: window.innerHeight - rect.top + 6, left: rect.left, width: rect.width, zIndex: 9999 }
          : { position: 'fixed', top: rect.bottom + 6, left: rect.left, width: rect.width, zIndex: 9999 }
        )
      }
    }
    setIsOpen(prev => !prev)
  }

  const selectedOption = options.find(o => o.value === value)
  const isEmptyValue = !selectedOption || selectedOption.value === ''

  // Trigger border colors
  const triggerBorder = error
    ? 'border-red-500/50'
    : isAccent
      ? isOpen ? 'border-app-accent' : 'border-app-accent/40 hover:border-app-accent/60'
      : isOpen ? 'border-white' : 'border-white/20 hover:border-white/40'

  const dropdown = isOpen
    ? createPortal(
        <div
          data-select-dropdown
          style={dropdownStyle}
          className="bg-app-primary border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        >
          <div ref={listRef} className="max-h-52 overflow-y-auto">
            {options.map(option => {
              const isSelected = option.value === value
              const isHighlighted = typeahead && typeaheadBuffer && option.label.toUpperCase().startsWith(typeaheadBuffer)
              return (
                <button
                  key={option.value}
                  data-value={option.value}
                  type="button"
                  onClick={() => { onChange(option.value); setIsOpen(false) }}
                  style={{ padding: '0.75rem 1.25rem' }}
                  className={cn(
                    'w-full text-left text-sm transition-colors duration-150 flex items-center justify-between gap-2',
                    isAccent
                      ? isSelected
                        ? 'text-app-accent bg-app-accent/10'
                        : isHighlighted
                          ? 'text-white bg-white/10'
                          : 'text-white/80 hover:bg-app-accent/5'
                      : isSelected
                        ? 'text-app-secondary bg-app-secondary/10'
                        : isHighlighted
                          ? 'text-white bg-white/10'
                          : 'text-white/80 hover:bg-white/5'
                  )}
                >
                  <span className="flex items-center gap-2">
                    {option.label}
                    {option.badge && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 999, background: 'rgba(230,194,132,0.2)', color: 'var(--color-app-secondary)', flexShrink: 0, lineHeight: 1 }}>
                        {option.badge}
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <Check
                      size={13}
                      weight="bold"
                      className={cn('shrink-0', isAccent ? 'text-app-accent' : 'text-app-secondary')}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )
    : null

  return (
    <div
      ref={wrapperRef}
      className={cn('flex flex-col gap-2', disabled && 'opacity-50 cursor-not-allowed', className)}
    >
      {label && <label className="text-sm font-medium text-white">{label}</label>}

      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={toggleDropdown}
          className={cn(
            'w-full bg-white/5 border rounded-xl text-left outline-none transition-all duration-300 flex items-center justify-between gap-2',
            triggerBorder
          )}
          style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', paddingLeft: '0.75rem', paddingRight: '0.75rem' }}
        >
          <span
            className={cn(
              'text-sm truncate flex items-center gap-2',
              isEmptyValue
                ? isAccent ? 'text-app-accent/50' : 'text-app-gray'
                : isAccent ? 'text-app-accent' : 'text-white'
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
            {selectedOption?.badge && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 999, background: 'rgba(230,194,132,0.2)', color: 'var(--color-app-secondary)', flexShrink: 0, lineHeight: 1 }}>
                {selectedOption.badge}
              </span>
            )}
          </span>
          <CaretDown
            size={14}
            weight="bold"
            className={cn(
              'shrink-0 transition-transform duration-200',
              isAccent ? 'text-app-accent' : 'text-app-gray',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      </div>

      {error && <span className="text-xs text-red-400">{error}</span>}
      {dropdown}
    </div>
  )
}
