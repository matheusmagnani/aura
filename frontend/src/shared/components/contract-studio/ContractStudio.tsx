import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { ResizableImage } from './ResizableImageExtension'
import FontFamily from '@tiptap/extension-font-family'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { X } from '@phosphor-icons/react'
import { type ContractTemplate, contractTemplateService } from '../../services/contractTemplateService'
import { VariableChipNode } from './VariableChipNode'
import { ContractToolbar } from './ContractToolbar'
import { VariablePickerPanel } from './VariablePickerPanel'
import { PageBreakExtension, PAGE_H, PAGE_PAD_V, PAGE_PAD_H, PAGE_GAP } from './PageBreakExtension'
import { FontSizeExtension } from './FontSizeExtension'

// Gradient per page: gray margin zones, white content area
const PAGE_BG = '#ffffff'

interface ContractStudioProps {
  template: ContractTemplate | null
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, content: Record<string, unknown>) => Promise<void>
}

export function ContractStudio({ template, isOpen, onClose, onSave }: ContractStudioProps) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [pageCount, setPageCount] = useState(1)
  const editorWrapperRef = useRef<HTMLDivElement>(null)
  const imageUrlsRef = useRef<Set<string>>(new Set())

  const extractImageUrls = useCallback((doc: Record<string, unknown>): Set<string> => {
    const urls = new Set<string>()
    const walk = (node: any) => {
      if (node?.type === 'image' && node.attrs?.src) urls.add(node.attrs.src)
      for (const child of node?.content ?? []) walk(child)
    }
    walk(doc)
    return urls
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      ResizableImage.configure({ inline: false, allowBase64: false }),
      TextStyle,
      FontFamily,
      FontSizeExtension,
      Color,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      VariableChipNode,
      PageBreakExtension,
    ],
    content: template?.content ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    editorProps: { attributes: { style: 'outline: none; position: relative;' } },
    onUpdate({ editor }) {
      const current = extractImageUrls(editor.getJSON() as Record<string, unknown>)
      const removed = [...imageUrlsRef.current].filter((url) => !current.has(url))
      removed.forEach((url) => contractTemplateService.deleteImage(url).catch(() => {}))
      imageUrlsRef.current = current
    },
  })

  // Track wrapper height → derive page count
  // Formula: height = N*(PAGE_H+PAGE_GAP) - PAGE_GAP → N = ceil((height+PAGE_GAP)/(PAGE_H+PAGE_GAP))
  useEffect(() => {
    const el = editorWrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setPageCount(Math.max(1, Math.ceil((el.scrollHeight + PAGE_GAP) / (PAGE_H + PAGE_GAP))))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      const content = template?.content ?? { type: 'doc', content: [{ type: 'paragraph' }] }
      setName(template?.name ?? '')
      setPageCount(1)
      editor?.commands.setContent(content)
      imageUrlsRef.current = extractImageUrls(content as Record<string, unknown>)
    }
  }, [isOpen, template])

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen || !editor) return null

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave(name.trim(), editor!.getJSON() as Record<string, unknown>)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const totalH = pageCount * PAGE_H + (pageCount - 1) * PAGE_GAP

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', background: 'var(--color-app-bg)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid rgba(106,166,193,0.2)', background: 'var(--color-app-primary)', flexShrink: 0 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do modelo..."
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '1rem', fontWeight: 600, color: 'var(--color-app-secondary)' }}
        />
        <button
          type="button"
          onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(106,166,193,0.15)', color: 'var(--color-app-accent)', flexShrink: 0 }}
        >
          <X size={18} weight="bold" />
        </button>
      </div>

      {/* Toolbar */}
      <ContractToolbar editor={editor} />

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Variable picker */}
        <div className="hidden md:flex">
          <VariablePickerPanel editor={editor} />
        </div>

        {/* Scroll area */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#e5e7eb', padding: '32px 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* Pages + editor overlay */}
            <div style={{ position: 'relative', width: '100%', maxWidth: 794, height: totalH }}>

              {/* Physical page divs */}
              {Array.from({ length: pageCount }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: i * (PAGE_H + PAGE_GAP),
                    left: 0, right: 0,
                    height: PAGE_H,
                    background: PAGE_BG,
                    borderRadius: 4,
                    boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
                  }}
                />
              ))}

              {/* Editor overlay */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1, color: '#111' }}>
                <div ref={editorWrapperRef} style={{ padding: `${PAGE_PAD_V}px ${PAGE_PAD_H}px` }}>
                  <EditorContent editor={editor} />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Floating save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !name.trim()}
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
          cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
          background: 'var(--color-app-accent)',
          color: 'var(--color-app-bg)',
          fontWeight: 700,
          fontSize: '0.9rem',
          opacity: saving || !name.trim() ? 0.55 : 1,
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          transition: 'opacity 0.15s, transform 0.15s',
        }}
        onMouseEnter={e => { if (!saving && name.trim()) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
      >
        {saving ? 'Salvando...' : 'Salvar'}
      </button>

      <style>{`
        .tiptap { outline: none; }
        .tiptap p { margin-bottom: 0.5em; }
        .tiptap h1, .tiptap h2, .tiptap h3 { margin-bottom: 0.4em; font-weight: 700; }
        .tiptap ul { list-style-type: disc; padding-left: 1.5em; margin: 0.4em 0; }
        .tiptap ol { list-style-type: decimal; padding-left: 1.5em; margin: 0.4em 0; }
        .tiptap li { margin-bottom: 0.2em; list-style: inherit; }
        .tiptap img { max-width: 100%; height: auto; }
        .tiptap img.ProseMirror-selectednode { outline: 2px solid var(--color-app-accent); }
      `}</style>
    </div>
  )
}
