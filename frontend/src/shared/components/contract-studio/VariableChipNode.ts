import { Node, mergeAttributes } from '@tiptap/core'

export interface VariableChipOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    variableChip: {
      insertVariableChip: (variable: string, label: string) => ReturnType
    }
  }
}

export const VariableChipNode = Node.create<VariableChipOptions>({
  name: 'variableChip',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      variable: { default: null },
      label: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-variable-chip]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-variable-chip': '',
        style:
          'display: inline-flex; align-items: center; background: rgba(106,166,193,0.18); color: var(--color-app-accent); border: 1px solid rgba(106,166,193,0.4); border-radius: 4px; padding: 0 6px; font-size: 0.78em; font-weight: 500; line-height: 1.6; cursor: default; user-select: none; white-space: nowrap;',
      }),
      HTMLAttributes.label ?? HTMLAttributes.variable,
    ]
  },

  addCommands() {
    return {
      insertVariableChip:
        (variable: string, label: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { variable, label },
          })
        },
    }
  },
})
