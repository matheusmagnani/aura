import { useToast } from '../hooks/useToast'
import { CheckCircle, XCircle, Warning, X } from '@phosphor-icons/react'

const icons = {
  success: <CheckCircle size={20} weight="fill" className="text-green-400" />,
  danger: <XCircle size={20} weight="fill" className="text-red-400" />,
  warning: <Warning size={20} weight="fill" className="text-yellow-400" />,
}

const bgColors = {
  success: 'bg-green-900/80 border-green-700',
  danger: 'bg-red-900/80 border-red-700',
  warning: 'bg-yellow-900/80 border-yellow-700',
}

export function Toast() {
  const { message, type, visible, hide } = useToast()

  if (!visible) return null

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${bgColors[type]} shadow-lg`}
      >
        {icons[type]}
        <span className="text-sm text-white">{message}</span>
        <button onClick={hide} className="ml-2 text-white/60 hover:text-white">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
