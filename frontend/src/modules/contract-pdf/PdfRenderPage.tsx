import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import { Color } from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { ResizableImage } from '../../shared/components/contract-studio/ResizableImageExtension'
import { VariableChipNode } from '../../shared/components/contract-studio/VariableChipNode'
import { FontSizeExtension } from '../../shared/components/contract-studio/FontSizeExtension'
import { PageBreakExtension, PAGE_PAD_V, PAGE_PAD_H } from '../../shared/components/contract-studio/PageBreakExtension'
import { PinnedBlockExtension } from '../../shared/components/contract-studio/PinnedBlockExtension'

/**
 * Headless render surface for server-side PDF generation.
 *
 * The backend (puppeteer) navigates to `/__pdf-render`, calls
 * `window.__renderContractForPdf(content, padV, padH)` and then waits for
 * `window.__pdfReady === true`. It renders the contract with the EXACT same
 * TipTap editor + PageBreakExtension as ContractViewModal, so the layout — and
 * therefore the page breaks and page count — is identical to the on-screen
 * preview instead of a re-implementation. The backend then slices the laid-out
 * canvas (this wrapper) into A4 pages. Nothing here is meant to be seen by users.
 */

interface PinnedImageOverlay {
  pos: number
  src: string
  width: number | null
  align: string
  pinnedVisualY: number
  marginTop: number
}

interface RenderReq {
  content: any
  padV: number
  padH: number
}

const EMPTY_DOC = { type: 'doc', content: [] }

export function PdfRenderPage() {
  const [req, setReq] = useState<RenderReq | null>(null)
  const [pinnedImageOverlays, setPinnedImageOverlays] = useState<PinnedImageOverlay[]>([])
  const wrapperRef = useRef<HTMLDivElement>(null)

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
      PinnedBlockExtension,
    ],
    content: EMPTY_DOC,
    editable: false,
    immediatelyRender: false,
  })

  // Expose the entry point the backend calls. Reset the ready flag on each call
  // so a page can (in theory) be reused for multiple renders.
  useEffect(() => {
    ;(window as any).__pdfReady = false
    ;(window as any).__renderContractForPdf = (content: any, padV: number, padH: number) => {
      ;(window as any).__pdfReady = false
      setReq({ content, padV: padV ?? PAGE_PAD_V, padH: padH ?? PAGE_PAD_H })
    }
    return () => {
      delete (window as any).__renderContractForPdf
    }
  }, [])

  useEffect(() => {
    if (editor && req?.content) {
      queueMicrotask(() => editor.commands.setContent(req.content))
    }
  }, [editor, req])

  // Mirror ContractViewModal: pinned images are hidden off-screen by
  // PageBreakExtension and rendered here as overlays at their captured Y.
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
          })
        }
      })
      setPinnedImageOverlays(overlays)
    }
    editor.on('update', collect)
    collect()
    return () => { editor.off('update', collect) }
  }, [editor])

  // Signal readiness once the layout has settled: wait for fonts + images, then
  // poll the wrapper height until it stops changing across consecutive frames
  // (PageBreakExtension converges over several async passes).
  useEffect(() => {
    if (!editor || !req) return
    let cancelled = false
    let raf = 0

    const settle = async () => {
      // Force EVERY declared @font-face to load — not just fonts.ready. A font used
      // only as a line-box strut (e.g. the paragraphs' default "Maven Pro" when their
      // visible text is inside Courier New spans) paints no glyphs, so Chromium may not
      // request it; the strut then falls back to a different-height font and every line
      // shifts, desyncing the PDF layout from the on-screen preview. Loading them all up
      // front makes line metrics deterministic. (Only fonts actually painted still embed.)
      try {
        const fonts = (document as any).fonts
        if (fonts) {
          await Promise.all(Array.from(fonts).map((f: any) => f.load().catch(() => {})))
          await fonts.ready
        }
      } catch {}
      const el = wrapperRef.current
      if (!el) return
      try {
        await Promise.all(
          Array.from(el.querySelectorAll('img')).map((img) =>
            (img as HTMLImageElement).decode().catch(() => {}),
          ),
        )
      } catch {}

      let stableFrames = 0
      let lastH = -1
      let guard = 0
      const tick = () => {
        if (cancelled) return
        const h = el.scrollHeight
        if (h === lastH) stableFrames++
        else { stableFrames = 0; lastH = h }
        guard++
        // ~8 stable frames in a row, or a hard cap so we never hang.
        if (stableFrames >= 8 || guard > 600) {
          ;(window as any).__pdfReady = true
          return
        }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    settle()
    return () => { cancelled = true; if (raf) cancelAnimationFrame(raf) }
  }, [editor, req, pinnedImageOverlays])

  const padV = req?.padV ?? PAGE_PAD_V
  const padH = req?.padH ?? PAGE_PAD_H

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, background: '#fff' }}>
      <div style={{ width: 794 }}>
        <div
          ref={wrapperRef}
          data-editor-wrapper
          data-pdf-wrapper
          style={{ position: 'relative', padding: `${padV}px ${padH}px`, color: '#111' }}
        >
          {editor && <EditorContent editor={editor} />}

          {pinnedImageOverlays.map((overlay) => (
            <div
              key={overlay.pos}
              style={{
                position: 'absolute',
                top: padV + overlay.pinnedVisualY,
                left: padH,
                right: padH,
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
                <img
                  src={overlay.src}
                  alt=""
                  style={{
                    width: overlay.width ? `${overlay.width}px` : undefined,
                    maxWidth: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Identical to ContractViewModal so wrapping/heights match the preview. */}
      <style>{`
        .tiptap { outline: none; }
        .tiptap p { margin-bottom: 0.5em; word-break: break-word; overflow-wrap: break-word; }
        .tiptap h1, .tiptap h2, .tiptap h3 { margin-bottom: 0.4em; font-weight: 700; word-break: break-word; overflow-wrap: break-word; }
        .tiptap ul { list-style-type: disc; padding-left: 1.5em; margin: 0.4em 0; }
        .tiptap ol { list-style-type: decimal; padding-left: 1.5em; margin: 0.4em 0; }
        .tiptap li { margin-bottom: 0.2em; list-style: inherit; }
        .tiptap img { max-width: 100%; height: auto; }
      `}</style>
    </div>
  )
}
