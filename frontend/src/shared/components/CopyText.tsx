import { useState } from 'react'
import { Copy, Check } from '@phosphor-icons/react'
import { useToast } from '../hooks/useToast'

interface CopyTextProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function CopyText({ value, children, className = '' }: CopyTextProps) {
  const [copied, setCopied] = useState(false)
  const { addToast } = useToast()

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      addToast('Copiado!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      addToast('Erro ao copiar', 'danger')
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-opacity ${className}`}
    >
      {children}
      {copied ? (
        <span className="inline-flex items-center gap-1 text-green-400">
          <Check className="w-3.5 h-3.5 shrink-0" weight="bold" />
          <span className="text-xs">Copiado</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-app-secondary/30">
          <Copy className="w-3.5 h-3.5 shrink-0" weight="regular" />
          <span className="text-xs">Copiar</span>
        </span>
      )}
    </button>
  )
}
