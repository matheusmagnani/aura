import * as React from 'react'
import { createPortal } from 'react-dom'
import { CaretDown, Check } from '@phosphor-icons/react'
import { cn } from '../../utils/cn'

export interface SelectOption {
  value: string
  label: string
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
  className?: string
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
  className,
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({})
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
  React.useEffect(() => {
    if (!isOpen) return
    function handleClose() { setIsOpen(false) }
    window.addEventListener('scroll', handleClose, true)
    window.addEventListener('resize', handleClose)
    return () => {
      window.removeEventListener('scroll', handleClose, true)
      window.removeEventListener('resize', handleClose)
    }
  }, [isOpen])

  function toggleDropdown() {
    if (disabled) return
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropdownHeight = 220
      const openUp = spaceBelow < dropdownHeight + 8
      setDropdownStyle(openUp
        ? { position: 'fixed', bottom: window.innerHeight - rect.top + 6, left: rect.left, width: rect.width, zIndex: 9999 }
        : { position: 'fixed', top: rect.bottom + 6, left: rect.left, width: rect.width, zIndex: 9999 }
      )
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
          <div className="max-h-52 overflow-y-auto">
            {options.map(option => {
              const isSelected = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { onChange(option.value); setIsOpen(false) }}
                  style={{ padding: '0.75rem 1.25rem' }}
                  className={cn(
                    'w-full text-left text-sm transition-colors duration-150 flex items-center justify-between gap-2',
                    isAccent
                      ? isSelected
                        ? 'text-app-accent bg-app-accent/10'
                        : 'text-white/80 hover:bg-app-accent/5'
                      : isSelected
                        ? 'text-app-secondary bg-app-secondary/10'
                        : 'text-white/80 hover:bg-white/5'
                  )}
                >
                  <span>{option.label}</span>
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
              'text-sm truncate',
              isEmptyValue
                ? isAccent ? 'text-app-accent/50' : 'text-app-gray'
                : isAccent ? 'text-app-accent' : 'text-white'
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
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
