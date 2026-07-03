import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import { Color } from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { ResizableImage } from './ResizableImageExtension'
import { VariableChipNode } from './VariableChipNode'
import { FontSizeExtension } from './FontSizeExtension'
import { PAGE_PAD_V, PAGE_PAD_H } from './PageBreakExtension'
import { PinnedBlockExtension } from './PinnedBlockExtension'

function unwrap(raw: Record<string, unknown> | null | undefined) {
  if (!raw || (raw as any).type === 'doc') {
    return { doc: raw ?? { type: 'doc', content: [] }, padV: PAGE_PAD_V, padH: PAGE_PAD_H }
  }
  return {
    doc: (raw as any).doc ?? { type: 'doc', content: [] },
    padV: (raw as any).pageMargins?.v ?? PAGE_PAD_V,
    padH: (raw as any).pageMargins?.h ?? PAGE_PAD_H,
  }
}

interface ContractPreviewProps {
  content: Record<string, unknown>
}

export function ContractPreview({ content }: ContractPreviewProps) {
  const { doc, padV, padH } = unwrap(content)

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
      PinnedBlockExtension,
    ],
    content: doc as any,
    editable: false,
    immediatelyRender: false,
  })

  useEffect(() => {
    if (editor && doc) editor.commands.setContent(doc as any)
  }, [editor, content])

  if (!editor) return null

  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '210 / 297',
        overflow: 'hidden',
        borderRadius: 8,
        background: '#fff',
        position: 'relative',
        border: '1px solid rgba(106,166,193,0.15)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 794,
          transformOrigin: 'top left',
          padding: `${padV}px ${padH}px`,
          color: '#111',
          pointerEvents: 'none',
        }}
        ref={(el) => {
          if (el) {
            const parentWidth = el.parentElement?.clientWidth ?? 200
            el.style.transform = `scale(${parentWidth / 794})`
          }
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
