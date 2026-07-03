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
  FilePdf,
  CircleNotch,
  ArrowsVertical,
  ArrowsHorizontal,
  PushPin,
} from '@phosphor-icons/react'
import { contractTemplateService } from '../../services/contractTemplateService'
import { readFileAsHtml, IMPORT_ACCEPT } from '../../services/fileParser'
import { useToast } from '../../hooks/useToast'
import { Select } from '../ui/Select'

// Must mirror FONT_FAMILIES in backend/src/modules/contracts/contract.fonts.ts so
// every option renders identically in the generated PDF. The web-safe names at the
// end map to metric-compatible bundled fonts on the server (Arial→Arimo, etc.).
const FONTS = [
  'Maven Pro', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Merriweather', 'Lora', 'PT Serif', 'Playfair Display',
  'Roboto Mono', 'Source Code Pro',
  'Arial', 'Times New Roman', 'Courier New', 'Georgia',
]
const SIZES = ['6pt', '7pt', '8pt', '9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '28pt', '32pt', '36pt', '48pt', '72pt']

const PAD_STEP = 4
const PAD_V_MIN = 20
const PAD_V_MAX = 120
const PAD_H_MIN = 20
const PAD_H_MAX = 150

interface ContractToolbarProps {
  editor: Editor
  pagePadV: number
  pagePadH: number
  onPadVChange: (v: number) => void
  onPadHChange: (v: number) => void
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
      onMouseDown={(e) => e.preventDefault()}
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
    <div style={{ width: 1, height: 20, background: 'rgba(106,166,193,0.25)', margin: '0 4px', flexShrink: 0 }} />
  )
}

const padBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
  borderRadius: 4,
  border: 'none',
  cursor: 'pointer',
  background: 'rgba(106,166,193,0.15)',
  color: 'var(--color-app-secondary)',
  fontSize: '0.8rem',
  lineHeight: 1,
  padding: 0,
}

const padValueStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: 'rgba(255,255,255,0.5)',
  fontFamily: 'monospace',
  minWidth: 34,
  textAlign: 'center',
}

function getCurrentBlockPinned(editor: Editor): boolean {
  const { selection } = editor.state
  const node = selection.$anchor.node(1)
  return node?.attrs?.pinned ?? false
}

export function ContractToolbar({ editor, pagePadV, pagePadH, onPadVChange, onPadHChange }: ContractToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
  const colorRef = useRef<HTMLInputElement>(null)
  const addToast = useToast((s) => s.addToast)
  const [importing, setImporting] = useState(false)

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

  async function handlePdfImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!editor.isEmpty && !window.confirm('Importar o PDF vai substituir todo o conteúdo atual do modelo. Deseja continuar?')) {
      return
    }
    setImporting(true)
    try {
      const html = await readFileAsHtml(file, { uploadImage: contractTemplateService.uploadImage })
      editor.commands.setContent(html)
      addToast('PDF importado. Revise e ajuste o conteúdo conforme necessário.', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erro ao importar o PDF.', 'danger')
    } finally {
      setImporting(false)
    }
  }

  const currentFont = editor.getAttributes('textStyle').fontFamily ?? 'Maven Pro'
  const currentSize = editor.getAttributes('textStyle').fontSize ?? '12pt'
  const currentColor = editor.getAttributes('textStyle').color

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
        position: 'relative',
        zIndex: 10,
      }}
    >
      <Select
        value={currentFont}
        onChange={(value) => editor.chain().focus().setFontFamily(value).run()}
        options={FONTS.map((f) => ({ value: f, label: f, font: f }))}
        typeahead
        className="w-[185px]"
      />

      <select
        value={currentSize}
        onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
        style={{
          height: 30, fontSize: '0.8rem', padding: '0 6px', borderRadius: 6,
          border: '1px solid rgba(106,166,193,0.3)', background: 'var(--color-app-bg)',
          color: 'var(--color-app-secondary)', cursor: 'pointer', minWidth: 70,
        }}
      >
        {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <Divider />

      <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito">
        <TextB size={16} weight="bold" />
      </ToolBtn>
      <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico">
        <TextItalic size={16} />
      </ToolBtn>
      <ToolBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado">
        <TextUnderline size={16} />
      </ToolBtn>

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          title="Cor do texto"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => colorRef.current?.click()}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, borderRadius: 6, cursor: 'pointer',
            background: 'transparent', border: 'none',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: currentColor ?? 'var(--color-app-secondary)' }}>A</span>
        </button>
        <input
          ref={colorRef}
          type="color"
          defaultValue="#e6c284"
          onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
          style={{ position: 'absolute', top: '100%', left: 0, opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
        />
      </div>

      <Divider />

      <ToolBtn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Alinhar à esquerda">
        <TextAlignLeft size={16} />
      </ToolBtn>
      <ToolBtn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Centralizar">
        <TextAlignCenter size={16} />
      </ToolBtn>
      <ToolBtn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Alinhar à direita">
        <TextAlignRight size={16} />
      </ToolBtn>
      <ToolBtn active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Justificar">
        <TextAlignJustify size={16} />
      </ToolBtn>

      <Divider />

      <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista com marcadores">
        <ListBullets size={16} />
      </ToolBtn>
      <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
        <ListNumbers size={16} />
      </ToolBtn>

      <Divider />

      {/* Pin block toggle — protects text block from being pushed by page breaks */}
      {(() => {
        const isPinned = getCurrentBlockPinned(editor)
        return (
          <ToolBtn
            active={isPinned}
            onClick={() => editor.chain().focus().toggleBlockPinned().run()}
            title={isPinned ? 'Desafixar bloco (volta a ser empurrado por quebras de página)' : 'Fixar bloco (não será empurrado por quebras de página)'}
          >
            <PushPin size={16} weight={isPinned ? 'fill' : 'regular'} />
          </ToolBtn>
        )
      })()}

      <Divider />

      <ToolBtn onClick={() => fileRef.current?.click()} title="Inserir imagem">
        <Image size={16} />
      </ToolBtn>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

      <ToolBtn
        onClick={() => { if (!importing) pdfRef.current?.click() }}
        title={importing ? 'Importando PDF...' : 'Importar de PDF'}
      >
        {importing ? <CircleNotch size={16} className="animate-spin" /> : <FilePdf size={16} />}
      </ToolBtn>
      <input ref={pdfRef} type="file" accept={IMPORT_ACCEPT} style={{ display: 'none' }} onChange={handlePdfImport} />

      <Divider />

      {/* Margens da página */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: '0.7rem', color: 'rgba(106,166,193,0.7)', fontWeight: 500, letterSpacing: '0.03em' }}>
          Margens
        </span>

        {/* Vertical */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} title="Margem vertical (topo e rodapé)">
          <ArrowsVertical size={13} style={{ color: 'rgba(106,166,193,0.6)' }} />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPadVChange(Math.max(PAD_V_MIN, pagePadV - PAD_STEP))}
            style={padBtnStyle}
          >−</button>
          <span style={padValueStyle}>{pagePadV}px</span>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPadVChange(Math.min(PAD_V_MAX, pagePadV + PAD_STEP))}
            style={padBtnStyle}
          >+</button>
        </div>

        {/* Horizontal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 8 }} title="Margem horizontal (laterais)">
          <ArrowsHorizontal size={13} style={{ color: 'rgba(106,166,193,0.6)' }} />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPadHChange(Math.max(PAD_H_MIN, pagePadH - PAD_STEP))}
            style={padBtnStyle}
          >−</button>
          <span style={padValueStyle}>{pagePadH}px</span>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPadHChange(Math.min(PAD_H_MAX, pagePadH + PAD_STEP))}
            style={padBtnStyle}
          >+</button>
        </div>
      </div>
    </div>
  )
}
