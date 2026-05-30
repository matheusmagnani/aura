import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import { Color } from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { X, DownloadSimple } from '@phosphor-icons/react'
import { ResizableImage } from '../../../shared/components/contract-studio/ResizableImageExtension'
import { VariableChipNode } from '../../../shared/components/contract-studio/VariableChipNode'
import { FontSizeExtension } from '../../../shared/components/contract-studio/FontSizeExtension'
import { PageBreakExtension, PAGE_H, PAGE_PAD_V, PAGE_PAD_H, PAGE_GAP } from '../../../shared/components/contract-studio/PageBreakExtension'
import type { Contract } from '../../../shared/services/contractService'
import { downloadPdf } from '../../../shared/utils/downloadFile'


interface ContractViewModalProps {
  contract: Contract | null
  onClose: () => void
}

export function ContractViewModal({ contract, onClose }: ContractViewModalProps) {
  const [pageCount, setPageCount] = useState(1)
  const editorWrapperRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily,
      FontSizeExtension,
      Color,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ResizableImage.configure({ inline: false, allowBase64: false }),
      VariableChipNode,
      PageBreakExtension,
    ],
    content: contract?.content ?? { type: 'doc', content: [] },
    editable: false,
    immediatelyRender: false,
  })

  useEffect(() => {
    if (editor && contract?.content) {
      editor.commands.setContent(contract.content)
    }
  }, [editor, contract])

  useEffect(() => {
    const el = editorWrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setPageCount(Math.max(1, Math.ceil((el.scrollHeight + PAGE_GAP) / (PAGE_H + PAGE_GAP))))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [contract])

  useEffect(() => {
    if (contract) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
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

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#e5e7eb', padding: '32px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 794, height: pageCount * PAGE_H + (pageCount - 1) * PAGE_GAP }}>
            {Array.from({ length: pageCount }).map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: i * (PAGE_H + PAGE_GAP),
                  left: 0, right: 0,
                  height: PAGE_H,
                  background: '#ffffff',
                  borderRadius: 4,
                  boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
                }}
              />
            ))}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, color: '#111', zIndex: 1 }}>
              <div ref={editorWrapperRef} style={{ padding: `${PAGE_PAD_V}px ${PAGE_PAD_H}px` }}>
                {editor && <EditorContent editor={editor} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating download button */}
      <button
        type="button"
        onClick={() => downloadPdf(contract.pdfUrl, contract.name)}
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

      <style>{`
        .tiptap { outline: none; }
        .tiptap p { margin-bottom: 0.5em; }
        .tiptap h1, .tiptap h2, .tiptap h3 { margin-bottom: 0.4em; font-weight: 700; }
        .tiptap ul { list-style-type: disc; padding-left: 1.5em; margin: 0.4em 0; }
        .tiptap ol { list-style-type: decimal; padding-left: 1.5em; margin: 0.4em 0; }
        .tiptap li { margin-bottom: 0.2em; list-style: inherit; }
        .tiptap img { max-width: 100%; height: auto; }
      `}</style>
    </div>
  )
}
