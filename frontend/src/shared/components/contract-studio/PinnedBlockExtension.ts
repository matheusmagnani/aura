import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pinnedBlock: {
      toggleBlockPinned: () => ReturnType
    }
  }
}

export const PinnedBlockExtension = Extension.create({
  name: 'pinnedBlock',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          pinned: {
            default: false,
            renderHTML: attrs => (attrs.pinned ? { 'data-pinned': 'true' } : {}),
            parseHTML: el => el.getAttribute('data-pinned') === 'true',
          },
          pinnedVisualY: {
            default: null,
            renderHTML: () => ({}),
            parseHTML: () => null,
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      toggleBlockPinned:
        () =>
        ({ state, dispatch, view }) => {
          const { selection } = state
          const node = selection.$anchor.node(1)
          if (!node || !['paragraph', 'heading'].includes(node.type.name)) return false
          const nodePos = selection.$anchor.before(1)
          const isPinned = node.attrs?.pinned ?? false

          if (!dispatch) return true

          if (isPinned) {
            dispatch(
              state.tr.setNodeMarkup(nodePos, undefined, {
                ...node.attrs,
                pinned: false,
                pinnedVisualY: null,
              }),
            )
          } else {
            // Capture current visual Y so the block stays at its current position
            // (which may include an existing page-break margin-top decoration).
            let pinnedVisualY: number | null = null
            const nodeEl = view.nodeDOM(nodePos) as HTMLElement | null
            if (nodeEl) {
              const pmRect = view.dom.getBoundingClientRect()
              pinnedVisualY = nodeEl.getBoundingClientRect().top - pmRect.top
            }
            dispatch(
              state.tr.setNodeMarkup(nodePos, undefined, {
                ...node.attrs,
                pinned: true,
                pinnedVisualY,
              }),
            )
          }

          return true
        },
    }
  },
})
