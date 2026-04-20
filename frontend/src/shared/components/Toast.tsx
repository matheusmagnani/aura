import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, Warning, X } from '@phosphor-icons/react'
import { useToast, type ToastType } from '../hooks/useToast'

const config: Record<ToastType, { icon: React.ReactNode; bg: string; border: string; iconColor: string }> = {
  success: {
    icon: <CheckCircle size={20} weight="fill" />,
    bg: '#14532d',
    border: '#166534',
    iconColor: '#86efac',
  },
  danger: {
    icon: <XCircle size={20} weight="fill" />,
    bg: '#450a0a',
    border: '#991b1b',
    iconColor: '#fca5a5',
  },
  warning: {
    icon: <Warning size={20} weight="fill" />,
    bg: '#431407',
    border: '#92400e',
    iconColor: '#fcd34d',
  },
}

export function Toast() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 toast-container">
      <AnimatePresence>
        {toasts.map((toast) => {
          const { icon, bg, border, iconColor } = config[toast.type]
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ duration: 0.25 }}
              className="toast-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                border: `1px solid ${border}`,
                background: bg,
                boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                color: iconColor,
              }}
            >
              {icon}
              <span style={{ flex: 1, fontSize: 'inherit', color: '#fff' }}>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
              >
                <X size={16} weight="bold" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
