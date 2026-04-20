import { ReactNode, useRef, useEffect } from 'react'

interface SettingsSectionProps {
  title: string
  description?: string
  icon?: ReactNode
  children: ReactNode
  isExpanded?: boolean
  onToggle?: () => void
  actions?: ReactNode
}

export function SettingsSection({
  title,
  description,
  icon,
  children,
  isExpanded = true,
  onToggle,
  actions,
}: SettingsSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const prevExpanded = useRef(isExpanded)

  useEffect(() => {
    if (isExpanded && !prevExpanded.current && sectionRef.current) {
      setTimeout(() => {
        const el = sectionRef.current!
        const HEADER_OFFSET = window.innerWidth >= 768 ? 80 : 16
        const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
      }, 50)
    }
    prevExpanded.current = isExpanded
  }, [isExpanded])

  return (
    <div
      ref={sectionRef}
      style={{
        background: 'var(--color-app-primary)',
        borderRadius: 16,
        border: '1px solid rgba(106,166,193,0.25)',
      }}
    >
      {/* Header */}
      <div
        onClick={onToggle}
        className="settings-header"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: onToggle ? 'pointer' : 'default',
          borderRadius: isExpanded ? '16px 16px 0 0' : 16,
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { if (onToggle) (e.currentTarget as HTMLDivElement).style.background = 'rgba(106,166,193,0.04)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = '' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {icon && (
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgba(106,166,193,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-app-accent)', flexShrink: 0,
            }}>
              {icon}
            </div>
          )}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-app-accent)', margin: 0 }}>{title}</h3>
            {description && (
              <p style={{ fontSize: 13, color: 'rgba(106,166,193,0.5)', margin: '2px 0 0', fontWeight: 300 }}>{description}</p>
            )}
          </div>
        </div>
        <div className="settings-actions-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 12 }} onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div
          className="settings-content"
          style={{ borderTop: '1px solid rgba(106,166,193,0.3)' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
