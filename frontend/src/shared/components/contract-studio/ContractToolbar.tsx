import { useRef, useState, useEffect } from 'react'
import { type Editor } from '@tiptap/react'
import {
  TextB,
  TextItalic,
  TextUnderline,
  TextAlignLeft,
  TextAlignCenter,
  TextAlignRight,
  TextAlignJustify,
  Image,
  ListBullets,
  ListNumbers,
} from '@phosphor-icons/react'
import { contractTemplateService } from '../../services/contractTemplateService'
import { useToast } from '../../hooks/useToast'

const FONTS = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS']
const SIZES = ['10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '28pt', '32pt', '36pt']

interface ContractToolbarProps {
  editor: Editor
}

function ToolBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        borderRadius: 6,
        border: 'none',
        cursor: 'pointer',
        background: active ? 'rgba(106,166,193,0.25)' : 'transparent',
        color: active ? 'var(--color-app-accent)' : 'var(--color-app-secondary)',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {children}
    </button>
  )
}

function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 20,
        background: 'rgba(106,166,193,0.25)',
        margin: '0 4px',
        flexShrink: 0,
      }}
    />
  )
}

export function ContractToolbar({ editor }: ContractToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const addToast = useToast((s) => s.addToast)

  // Force re-render whenever the editor selection or content changes
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const update = () => forceUpdate(n => n + 1)
    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
    }
  }, [editor])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const url = await contractTemplateService.uploadImage(file)
      editor.chain().focus().setImage({ src: url, width: null, align: 'left' } as any).run()
    } catch {
      addToast('Erro ao enviar imagem.', 'danger')
    }
    e.target.value = ''
  }

  const currentFont = editor.getAttributes('textStyle').fontFamily ?? 'Arial'
  const currentSize = editor.getAttributes('textStyle').fontSize ?? '12pt'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
        padding: '8px 12px',
        borderBottom: '1px solid rgba(106,166,193,0.2)',
        background: 'var(--color-app-primary)',
        flexShrink: 0,
      }}
    >
      {/* Font family */}
      <select
        value={currentFont}
        onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
        style={{
          height: 30,
          fontSize: '0.8rem',
          padding: '0 6px',
          borderRadius: 6,
          border: '1px solid rgba(106,166,193,0.3)',
          background: 'var(--color-app-bg)',
          color: 'var(--color-app-secondary)',
          cursor: 'pointer',
          minWidth: 130,
        }}
      >
        {FONTS.map((f) => (
          <option key={f} value={f} style={{ fontFamily: f }}>
            {f}
          </option>
        ))}
      </select>

      {/* Font size */}
      <select
        value={currentSize}
        onChange={(e) =>
          editor.chain().focus().setFontSize(e.target.value).run()
        }
        style={{
          height: 30,
          fontSize: '0.8rem',
          padding: '0 6px',
          borderRadius: 6,
          border: '1px solid rgba(106,166,193,0.3)',
          background: 'var(--color-app-bg)',
          color: 'var(--color-app-secondary)',
          cursor: 'pointer',
          minWidth: 70,
        }}
      >
        {SIZES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <Divider />

      <ToolBtn
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Negrito"
      >
        <TextB size={16} weight="bold" />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Itálico"
      >
        <TextItalic size={16} />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Sublinhado"
      >
        <TextUnderline size={16} />
      </ToolBtn>

      {/* Text color */}
      <label
        title="Cor do texto"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 30,
          height: 30,
          borderRadius: 6,
          cursor: 'pointer',
          background: 'transparent',
          position: 'relative',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: editor.getAttributes('textStyle').color ?? 'var(--color-app-secondary)' }}>A</span>
        <input
          type="color"
          defaultValue="#e6c284"
          onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
        />
      </label>

      <Divider />

      <ToolBtn
        active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        title="Alinhar à esquerda"
      >
        <TextAlignLeft size={16} />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        title="Centralizar"
      >
        <TextAlignCenter size={16} />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        title="Alinhar à direita"
      >
        <TextAlignRight size={16} />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive({ textAlign: 'justify' })}
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        title="Justificar"
      >
        <TextAlignJustify size={16} />
      </ToolBtn>

      <Divider />

      <ToolBtn
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Lista com marcadores"
      >
        <ListBullets size={16} />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Lista numerada"
      >
        <ListNumbers size={16} />
      </ToolBtn>

      <Divider />

      <ToolBtn onClick={() => fileRef.current?.click()} title="Inserir imagem">
        <Image size={16} />
      </ToolBtn>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
    </div>
  )
}
