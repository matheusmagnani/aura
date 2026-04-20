import * as React from 'react'
import { X } from '@phosphor-icons/react'
import { cn } from '../utils/cn'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: React.ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, children, title, className }: ModalProps) {
  React.useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ padding: '1rem' }}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />
      <div
        className={cn('relative z-10 rounded-2xl animate-modalIn shadow-2xl w-full max-w-md max-h-[90vh] overflow-auto', className)}
        style={{
          background: 'var(--color-app-primary)',
          border: '1px solid var(--color-app-accent)',
          padding: '1.5rem',
          margin: '0 0.35rem',
        }}
      >
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(106,166,193,0.3)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-app-accent)' }}>{title}</h2>
            <button
              onClick={onClose}
              style={{ padding: '0.4rem', borderRadius: '0.5rem', background: 'rgba(106,166,193,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={18} color="var(--color-app-accent)" weight="bold" />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.4rem', borderRadius: '0.5rem', background: 'rgba(106,166,193,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} color="var(--color-app-accent)" weight="bold" />
          </button>
        )}
        <div>{children}</div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
        .animate-modalIn { animation: modalIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  )
}
