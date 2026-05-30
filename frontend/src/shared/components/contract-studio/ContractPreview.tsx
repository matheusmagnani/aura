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

interface ContractPreviewProps {
  content: Record<string, unknown>
}

export function ContractPreview({ content }: ContractPreviewProps) {
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
    ],
    content,
    editable: false,
    immediatelyRender: false,
  })

  useEffect(() => {
    if (editor && content) editor.commands.setContent(content)
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
          padding: '40px 48px',
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
