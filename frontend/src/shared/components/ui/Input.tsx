import * as React from 'react'
import { X, Eye, EyeSlash, CalendarBlank } from '@phosphor-icons/react'
import { cn } from '../../utils/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
  onClear?: () => void
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, value, onChange, onClear, type, disabled, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement>(null)
    const inputRef = (ref as React.RefObject<HTMLInputElement>) || internalRef
    const hasValue = value !== undefined ? String(value).length > 0 : false
    const isPassword = type === 'password'
    const isDate = type === 'date'
    const [showPassword, setShowPassword] = React.useState(false)

    const handleClear = () => {
      if (onClear) {
        onClear()
      } else if (onChange) {
        onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)
      }
      inputRef.current?.focus()
    }

    const paddingLeft = icon ? 'pl-12' : 'pl-6'
    const paddingRight = (hasValue || isPassword || isDate) ? 'pr-10' : 'pr-6'
    const borderColor = error ? 'border-red-400 focus:border-red-400' : 'border-white/20 focus:border-white hover:border-white/40'
    const bgColor = error ? 'bg-red-500/10' : 'bg-white/5'

    return (
      <div className={cn('flex flex-col gap-2', disabled && 'opacity-50 cursor-not-allowed')}>
        {label && (
          <label className="text-sm font-medium text-white">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-app-gray">
              {icon}
            </div>
          )}
          <input
            ref={inputRef}
            value={value}
            onChange={onChange}
            type={isPassword && showPassword ? 'text' : type}
            style={{
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
              paddingLeft: icon ? '3rem' : '0.75rem',
              paddingRight: (hasValue || isPassword || isDate) ? '2.5rem' : '0.75rem',
            }}
            className={`w-full ${bgColor} border rounded-xl text-white placeholder:text-app-gray outline-none transition-all duration-300 ${borderColor} ${isDate ? '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer' : ''} ${className ?? ''}`}
            disabled={disabled}
            {...props}
          />
          {disabled ? null : isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-app-gray hover:text-white transition-colors"
            >
              {showPassword
                ? <EyeSlash className="w-5 h-5" weight="regular" />
                : <Eye className="w-5 h-5" weight="regular" />
              }
            </button>
          ) : hasValue ? (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-app-gray hover:text-white transition-colors"
            >
              <X className="w-4 h-4" weight="bold" />
            </button>
          ) : isDate ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-app-gray pointer-events-none">
              <CalendarBlank className="w-5 h-5" weight="regular" />
            </div>
          ) : null}
        </div>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
