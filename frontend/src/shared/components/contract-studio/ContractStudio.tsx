import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { ResizableImage } from './ResizableImageExtension'
import FontFamily from '@tiptap/extension-font-family'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { X, DesktopTower, PushPin } from '@phosphor-icons/react'
import { type ContractTemplate, contractTemplateService } from '../../services/contractTemplateService'
import { VariableChipNode } from './VariableChipNode'
import { ContractToolbar } from './ContractToolbar'
import { VariablePickerPanel } from './VariablePickerPanel'
import { PageBreakExtension, PAGE_H, PAGE_PAD_V, PAGE_PAD_H, PAGE_GAP, forcePageBreakMeasure } from './PageBreakExtension'
import { FontSizeExtension } from './FontSizeExtension'
import { PinnedBlockExtension } from './PinnedBlockExtension'

const PAGE_BG = '#ffffff'

interface PinnedImageOverlay {
  pos: number
  src: string
  width: number | null
  align: string
  pinnedVisualY: number
  marginTop: number
  marginBottom: number
}

// Wrapped content format: { pageMargins: { v, h }, doc: TipTapJSON }
// Legacy format (old templates): TipTapJSON directly ({ type: 'doc', ... })
type WrappedContent = { pageMargins: { v: number; h: number }; doc: Record<string, unknown> }

function unwrapContent(raw: Record<string, unknown> | null | undefined): {
  doc: Record<string, unknown>
  padV: number
  padH: number
} {
  if (!raw || (raw as any).type === 'doc') {
    return {
      doc: raw ?? { type: 'doc', content: [{ type: 'paragraph' }] },
      padV: PAGE_PAD_V,
      padH: PAGE_PAD_H,
    }
  }
  const wrapped = raw as WrappedContent
  return {
    doc: wrapped.doc ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    padV: wrapped.pageMargins?.v ?? PAGE_PAD_V,
    padH: wrapped.pageMargins?.h ?? PAGE_PAD_H,
  }
}

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
  const [pagePadV, setPagePadV] = useState(PAGE_PAD_V)
  const [pagePadH, setPagePadH] = useState(PAGE_PAD_H)
  const [pinnedImageOverlays, setPinnedImageOverlays] = useState<PinnedImageOverlay[]>([])
  const editorWrapperRef = useRef<HTMLDivElement>(null)
  const imageUrlsRef = useRef<Set<string>>(new Set())
  // Images that were already in the saved template — never delete these from S3
  // even if they temporarily disappear from getJSON() due to parsing quirks.
  const initialImageUrlsRef = useRef<Set<string>>(new Set())

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
      PinnedBlockExtension,
    ],
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    editorProps: {
      attributes: { style: 'outline: none; position: relative;' },
      // Normalise newlines from pasted PDF/plain-text so each line becomes its own
      // paragraph and blank lines (3+ consecutive \n) become an empty paragraph.
      // TipTap splits pasted text on \n\n into separate <p> nodes, so:
      //   \n  (single) → \n\n  : each line becomes its own paragraph
      //   \n\n\n+ → \n\n\n\n  : 4 newlines = empty paragraph in between (blank line)
      transformPastedText(text: string) {
        return text
          .replace(/\r\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n\n\n')
          .replace(/(?<!\n)\n(?!\n)/g, '\n\n')
      },
    },
    onUpdate({ editor }) {
      const current = extractImageUrls(editor.getJSON() as Record<string, unknown>)
      const removed = [...imageUrlsRef.current].filter((url) => !current.has(url))
      // Never delete images that were in the saved template — only clean up images
      // that were uploaded during this editing session (not in initialImageUrlsRef).
      removed
        .filter((url) => !initialImageUrlsRef.current.has(url))
        .forEach((url) => contractTemplateService.deleteImage(url).catch(() => {}))
      imageUrlsRef.current = current
    },
  })

  // Track wrapper height → derive page count
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
      const { doc, padV, padH } = unwrapContent(template?.content as any)
      setName(template?.name ?? '')
      setPageCount(1)
      setPagePadV(padV)
      setPagePadH(padH)
      const templateImages = extractImageUrls(doc)
      initialImageUrlsRef.current = templateImages
      imageUrlsRef.current = new Set(templateImages)
      queueMicrotask(() => editor?.commands.setContent(doc as any))
    }
  }, [isOpen, template])

  // Re-measure page breaks whenever padding changes (content area changed)
  useEffect(() => {
    if (!isOpen) return
    forcePageBreakMeasure()
  }, [pagePadV, pagePadH, isOpen])

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Collect pinned image nodes from the editor so we can render them as overlays.
  // Images are hidden in TipTap (position:absolute;top:-9999px) and rendered here
  // instead, completely decoupling their visual position from the ProseMirror flow.
  useEffect(() => {
    if (!editor) return
    const collect = () => {
      const overlays: PinnedImageOverlay[] = []
      editor.state.doc.forEach((node, pos) => {
        if (
          node.type.name === 'image' &&
          node.attrs.pinned === true &&
          typeof node.attrs.pinnedVisualY === 'number'
        ) {
          overlays.push({
            pos,
            src: node.attrs.src as string,
            width: node.attrs.width as number | null,
            align: (node.attrs.align as string) || 'left',
            pinnedVisualY: node.attrs.pinnedVisualY as number,
            marginTop: (node.attrs.marginTop as number) || 0,
            marginBottom: (node.attrs.marginBottom as number) || 0,
          })
        }
      })
      setPinnedImageOverlays(overlays)
    }
    editor.on('update', collect)
    collect()
    return () => { editor.off('update', collect) }
  }, [editor])

  const unpinImage = useCallback((pos: number) => {
    if (!editor) return
    const node = editor.state.doc.nodeAt(pos)
    if (!node || node.type.name !== 'image') return
    editor.view.dispatch(
      editor.state.tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        pinned: false,
        pinnedVisualY: null,
      }),
    )
  }, [editor])

  if (!isOpen || !editor) return null

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const content: WrappedContent = {
        pageMargins: { v: pagePadV, h: pagePadH },
        doc: editor!.getJSON() as Record<string, unknown>,
      }
      await onSave(name.trim(), content as unknown as Record<string, unknown>)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', background: 'var(--color-app-bg)' }}>

      {/* Mobile warning */}
      <div className="md:hidden flex items-center gap-3 flex-shrink-0" style={{ background: 'var(--color-app-secondary)', padding: '10px 20px' }}>
        <DesktopTower size={20} weight="bold" style={{ color: 'var(--color-app-primary)', flexShrink: 0 }} />
        <p style={{ fontSize: 13, color: 'var(--color-app-primary)', margin: 0, lineHeight: 1.4, fontWeight: 500 }}>
          Para uma melhor experiência, acesse esta área pelo computador.
        </p>
      </div>

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
      <ContractToolbar
        editor={editor}
        pagePadV={pagePadV}
        pagePadH={pagePadH}
        onPadVChange={setPagePadV}
        onPadHChange={setPagePadH}
      />

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Variable picker */}
        <div className="hidden md:flex">
          <VariablePickerPanel editor={editor} />
        </div>

        {/* Scroll area */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#e5e7eb', padding: '32px 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* Pages + editor */}
            <div style={{ position: 'relative', width: '100%', maxWidth: 794 }}>

              {/* Physical page divs - atrás do editor, sem capturar cliques */}
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
                    pointerEvents: 'none',
                  }}
                />
              ))}

              {/* Editor em fluxo normal - sua altura determina o container */}
              <div
                ref={editorWrapperRef}
                data-editor-wrapper
                style={{ position: 'relative', zIndex: 1, padding: `${pagePadV}px ${pagePadH}px`, color: '#111' }}
              >
                <EditorContent editor={editor} />

                {/* Pinned image overlays — rendered outside TipTap's flow so React
                    NodeView style conflicts cannot affect their position. Each overlay
                    sits at the exact Y the user captured when they clicked "pin". */}
                {pinnedImageOverlays.map((overlay) => (
                  <div
                    key={overlay.pos}
                    style={{
                      position: 'absolute',
                      top: pagePadV + overlay.pinnedVisualY,
                      left: pagePadH,
                      right: pagePadH,
                      pointerEvents: 'none',
                      zIndex: 2,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        marginTop: overlay.marginTop || undefined,
                        justifyContent:
                          overlay.align === 'center' ? 'center'
                          : overlay.align === 'right' ? 'flex-end'
                          : 'flex-start',
                      }}
                    >
                      <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
                        <img
                          src={overlay.src}
                          alt=""
                          style={{
                            width: overlay.width ? `${overlay.width}px` : undefined,
                            maxWidth: '100%',
                            height: 'auto',
                            display: 'block',
                            outline: '1.5px dashed rgba(106,166,193,0.6)',
                            outlineOffset: 3,
                          }}
                        />
                        {/* Unpin button — pointerEvents:auto overrides parent's none */}
                        <button
                          type="button"
                          title="Clique para desafixar"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            unpinImage(overlay.pos)
                          }}
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: 'rgba(106,166,193,0.9)',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                            zIndex: 10,
                            pointerEvents: 'auto',
                            color: '#fff',
                            padding: 0,
                          }}
                        >
                          <PushPin size={11} weight="fill" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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
        .tiptap p { margin-bottom: 0.5em; word-break: break-word; overflow-wrap: break-word; }
        .tiptap h1, .tiptap h2, .tiptap h3 { margin-bottom: 0.4em; font-weight: 700; word-break: break-word; overflow-wrap: break-word; }
        .tiptap ul { list-style-type: disc; padding-left: 1.5em; margin: 0.4em 0; }
        .tiptap ol { list-style-type: decimal; padding-left: 1.5em; margin: 0.4em 0; }
        .tiptap li { margin-bottom: 0.2em; list-style: inherit; }
        .tiptap img { max-width: 100%; height: auto; }
        .tiptap img.ProseMirror-selectednode { outline: 2px solid var(--color-app-accent); }
        .tiptap [data-pinned="true"] { outline: 1.5px dashed rgba(106,166,193,0.6); outline-offset: 3px; }
      `}</style>
    </div>
  )
}
