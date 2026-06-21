import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { VariableChipView } from './VariableChipView'

export interface VariableChipFormatAttrs {
  color: string | null
  bold: boolean
  italic: boolean
  underline: boolean
  fontSize: string | null
  fontFamily: string | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    variableChip: {
      insertVariableChip: (variable: string, label: string) => ReturnType
    }
  }
}

export const VariableChipNode = Node.create({
  name: 'variableChip',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      variable: { default: null },
      label: { default: null },
      color: { default: null },
      bold: { default: false },
      italic: { default: false },
      underline: { default: false },
      fontSize: { default: null },
      fontFamily: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-variable-chip]' }]
  },

  // renderHTML é usado para serialização HTML e parsing de paste
  renderHTML({ node, HTMLAttributes }) {
    const { color, bold, italic, underline, fontSize, fontFamily, label, variable } = node.attrs
    const style = [
      'display: inline-flex',
      'align-items: center',
      'background: rgba(106,166,193,0.18)',
      'border: 1px solid rgba(106,166,193,0.4)',
      'border-radius: 4px',
      'padding: 0 6px',
      'line-height: 1.6',
      'white-space: nowrap',
      `color: ${color ?? 'var(--color-app-accent)'}`,
      `font-weight: ${bold ? 'bold' : '500'}`,
      ...(italic ? ['font-style: italic'] : []),
      ...(underline ? ['text-decoration: underline'] : []),
      fontSize ? `font-size: ${fontSize}` : 'font-size: 0.78em',
      ...(fontFamily ? [`font-family: ${fontFamily}`] : []),
    ].join('; ')

    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-variable-chip': '', style }),
      label ?? variable,
    ]
  },

  // NodeView React para exibição no editor (painel de formatação embutido)
  addNodeView() {
    return ReactNodeViewRenderer(VariableChipView)
  },

  addCommands() {
    return {
      insertVariableChip:
        (variable: string, label: string) =>
        ({ commands, editor }) => {
          const textStyle = editor.getAttributes('textStyle')
          return commands.insertContent({
            type: this.name,
            attrs: {
              variable,
              label,
              color: textStyle.color ?? null,
              fontSize: textStyle.fontSize ?? null,
              fontFamily: textStyle.fontFamily ?? null,
              bold: editor.isActive('bold'),
              italic: editor.isActive('italic'),
              underline: editor.isActive('underline'),
            },
          })
        },
    }
  },
})
