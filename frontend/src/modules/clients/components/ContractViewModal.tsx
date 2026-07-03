import { useEffect, useState } from 'react'
import { useToast } from '../../../shared/hooks/useToast'
import { X, DownloadSimple, SpinnerGap } from '@phosphor-icons/react'
import { contractService } from '../../../shared/services/contractService'
import type { Contract } from '../../../shared/services/contractService'
import { triggerDownload } from '../../../shared/utils/downloadFile'

interface ContractViewModalProps {
  contract: Contract | null
  onClose: () => void
}

/**
 * Contract preview. Shows the EXACT generated PDF (the same file the user downloads),
 * not a client-side re-render — a browser-side TipTap render never matches the
 * server-side puppeteer PDF pixel-for-pixel (different Chromium engines shift the
 * per-page content distribution). Displaying the real PDF guarantees the preview and
 * the download are identical.
 */
export function ContractViewModal({ contract, onClose }: ContractViewModalProps) {
  const toast = useToast()
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (contract) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [contract])

  // Fetch the generated PDF as a blob and show it via an object URL, so it renders
  // inline regardless of how S3 serves the file, and reuses the authenticated route.
  useEffect(() => {
    if (!contract) return
    let objectUrl: string | null = null
    let cancelled = false
    setLoading(true)
    setFailed(false)
    setPdfUrl(null)

    contractService
      .downloadBlob(contract.id)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setPdfUrl(objectUrl)
      })
      .catch(() => {
        if (cancelled) return
        setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [contract])

  if (!contract) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', flexDirection: 'column',
        background: 'var(--color-app-bg)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
          borderBottom: '1px solid rgba(106,166,193,0.2)',
          background: 'var(--color-app-primary)', flexShrink: 0,
        }}
      >
        <p style={{ flex: 1, fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-app-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {contract.name}
        </p>

        <button
          type="button"
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'rgba(106,166,193,0.15)', color: 'var(--color-app-accent)', flexShrink: 0,
          }}
        >
          <X size={18} weight="bold" />
        </button>
      </div>

      {/* PDF viewer */}
      <div style={{ flex: 1, minHeight: 0, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--color-app-gray)' }}>
            <SpinnerGap size={32} className="animate-spin" />
            <span style={{ fontSize: '0.85rem' }}>Carregando contrato…</span>
          </div>
        )}

        {!loading && failed && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--color-app-gray)', padding: 24, textAlign: 'center' }}>
            <span style={{ fontSize: '0.9rem' }}>Não foi possível carregar o contrato.</span>
            <span style={{ fontSize: '0.8rem' }}>Use o botão “Baixar PDF” abaixo.</span>
          </div>
        )}

        {!loading && !failed && pdfUrl && (
          <iframe
            src={pdfUrl}
            title={contract.name}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        )}
      </div>

      {/* Floating download button */}
      <button
        type="button"
        onClick={async () => {
          try {
            const blob = await contractService.downloadBlob(contract.id)
            await triggerDownload(blob, contract.name)
          } catch {
            toast.addToast('Erro ao baixar o contrato. Tente novamente.', 'danger')
          }
        }}
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 24px',
          borderRadius: 12,
          border: 'none',
          cursor: 'pointer',
          background: 'var(--color-app-accent)',
          color: 'var(--color-app-bg)',
          fontWeight: 700,
          fontSize: '0.9rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
      >
        <DownloadSimple size={18} weight="bold" />
        Baixar PDF
      </button>
    </div>
  )
}
